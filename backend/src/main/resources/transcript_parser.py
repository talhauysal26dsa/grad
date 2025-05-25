import os
import re
import csv
import sys
import zipfile
import traceback
from io import StringIO

def extract_text_from_pdf(pdf_path):
    """Extract text content from a PDF file"""
    try:
        import PyPDF2
        text = ""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return ""

def extract_totals_from_pdf(text):
    """Extract total credits, ECTS, and GPA from the last 'Genel :' section in the PDF"""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Find all "Genel :" lines and get the last one
    genel_indices = []
    for i, line in enumerate(lines):
        if line.strip() == "Genel :":
            genel_indices.append(i)
    
    if not genel_indices:
        return None, None, None
    
    # Get the last "Genel :" section
    last_genel_index = genel_indices[-1]
    
    # Extract values from lines after "Genel :"
    try:
        # Line after "Genel :" should contain enrolled credits/ECTS (skip this)
        # Second line after "Genel :" contains completed credits/ECTS (Tamamlanan)
        completed_line = lines[last_genel_index + 2].strip()
        
        # Parse "93 | 162" format
        if '|' in completed_line:
            parts = completed_line.split('|')
            total_credit = parts[0].strip()
            total_ects = parts[1].strip()
        else:
            return None, None, None
        
        # GPA is typically 6 lines after "Genel :" (after -, before next section)
        gpa_line = lines[last_genel_index + 6].strip()
        
        # Handle comma decimal separator
        gpa = gpa_line.replace(',', '.')
        
        return total_credit, total_ects, gpa
        
    except (IndexError, ValueError) as e:
        return None, None, None

def parse_transcript(text, student_id):
    """Parse transcript text and extract relevant information"""
    # Initialize data structure
    transcript_data = {
        'student_id': student_id,
        'courses': [],
        'total_credit': 0,
        'total_ects': 0,
        'gpa': 0.0
    }
    
    # Split text into lines and clean up each line
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Regular expressions
    term_pattern = r"(\d{4}-\d{4})\s+Yılı\s+(Güz|Bahar|Yaz)\s+Dönemi"
    course_code_pattern = r"^([A-Z]+\d+)$"
    credit_ects_pattern = r"^(\d+)\s*\|\s*(\d+)$"
    grade_pattern = r"^([A-Z]{1,2})\((\d+(?:,\d+)?)\)$"
    language_pattern = r"^\([A-Z]{2}\)$"
    
    # Find all term sections
    term_sections = []
    
    for i, line in enumerate(lines):
        term_match = re.search(term_pattern, line)
        if term_match:
            year = term_match.group(1)
            semester = term_match.group(2)
            # Convert Turkish semester names to English
            semester_map = {"Güz": "Fall", "Bahar": "Spring", "Yaz": "Summer"}
            if semester in semester_map:
                semester = semester_map[semester]
            current_term = f"{year} {semester}"
            term_sections.append((current_term, i))
    
    # Reduce debug output when called from Java
    debug_mode = len(sys.argv) < 3  # Only show debug if not called with zip and output args
    
    if debug_mode:
        print(f"Found {len(term_sections)} term sections: {[term[0] for term in term_sections]}")
    
    # Process each term section
    for term_idx, (term, start_line) in enumerate(term_sections):
        # Determine end line for this term section
        if term_idx + 1 < len(term_sections):
            end_line = term_sections[term_idx + 1][1]
        else:
            end_line = len(lines)
        
        if debug_mode:
            print(f"\nProcessing term: {term} (lines {start_line} to {end_line})")
        
        # Process lines in this term section
        i = start_line + 1  # Skip the term header line
        while i < end_line:
            line = lines[i]
            
            # Check if this line is a course code
            if re.match(course_code_pattern, line):
                course_code = line
                course_name = ""
                credit = ""
                ects = ""
                grade = ""
                
                if debug_mode:
                    print(f"  Found course code: {course_code}")
                
                # Look ahead to collect course information
                j = i + 1
                while j < end_line:
                    current_line = lines[j]
                    
                    # Check if we hit another course code (end of current course)
                    if re.match(course_code_pattern, current_line):
                        break
                    
                    # Check if this line contains credit/ECTS pattern
                    credit_match = re.match(credit_ects_pattern, current_line)
                    if credit_match:
                        credit = credit_match.group(1)
                        ects = credit_match.group(2)
                        if debug_mode:
                            print(f"    Found credit/ECTS: {credit}/{ects}")
                        j += 1
                        continue
                    
                    # Check if this line contains grade pattern
                    grade_match = re.match(grade_pattern, current_line)
                    if grade_match:
                        grade = grade_match.group(1)
                        if debug_mode:
                            print(f"    Found grade: {grade}")
                        j += 1
                        continue
                    
                    # Check if this line is a language indicator
                    if re.match(language_pattern, current_line):
                        if debug_mode:
                            print(f"    Found language indicator: {current_line}")
                        j += 1
                        continue
                    
                    # Check if this line contains summary information (skip it)
                    if any(keyword in current_line for keyword in ["Alınan", "Tamamlanan", "Hesaplanan", "Yarıyıl", "Genel", "Bu belge"]):
                        break
                    
                    # Otherwise, this line is part of the course name
                    if course_name:
                        course_name += " " + current_line
                    else:
                        course_name = current_line
                    if debug_mode:
                        print(f"    Adding to course name: {current_line}")
                    
                    j += 1
                
                # If we found all required information, add the course
                if course_code and course_name and credit and ects and grade:
                    if debug_mode:
                        print(f"    Adding course: {course_code} - {course_name} - {grade}")
                    add_course_to_transcript(transcript_data, term, course_code, course_name, credit, ects, grade)
                else:
                    if debug_mode:
                        print(f"    Incomplete course data: code={course_code}, name='{course_name}', credit={credit}, ects={ects}, grade={grade}")
                
                # Move to the next line after this course
                i = j
            else:
                i += 1
    
    # Extract totals from PDF instead of calculating
    pdf_total_credit, pdf_total_ects, pdf_gpa = extract_totals_from_pdf(text)
    
    if pdf_total_credit is not None:
        transcript_data['total_credit'] = int(pdf_total_credit)
        transcript_data['total_ects'] = int(pdf_total_ects)
        transcript_data['gpa'] = pdf_gpa
        if debug_mode:
            print(f"Using PDF-extracted totals: Credit={pdf_total_credit}, ECTS={pdf_total_ects}, GPA={pdf_gpa}")
    else:
        # Fallback: calculate if extraction failed
        if debug_mode:
            print("PDF extraction failed, calculating totals...")
        for course in transcript_data['courses']:
            transcript_data['total_credit'] += int(course['credit'])
            transcript_data['total_ects'] += int(course['ects'])
        
        # Calculate GPA if not found
        if transcript_data['courses']:
            total_weighted = 0.0
            total_credits = 0
            
            for course in transcript_data['courses']:
                grade_point_float = float(course['grade_point'])
                credit = int(course['credit'])
                total_weighted += grade_point_float * credit
                total_credits += credit
            
            if total_credits > 0:
                calculated_gpa = total_weighted / total_credits
                transcript_data['gpa'] = f"{calculated_gpa:.2f}"
    
    # Compute term_count
    if term_sections:
        first_term = term_sections[0][0]  # e.g. "2020-2021 Fall"
        last_term  = term_sections[-1][0] # e.g. "2023-2024 Spring"
        # Extract first year (e.g. 2020) from first term (e.g. "2020-2021 Fall")
        first_year = int(first_term.split("-")[0].strip())
        # Extract last year (e.g. 2024) from last term (e.g. "2023-2024 Spring")
        last_year  = int(last_term.split("-")[1].strip().split()[0])
        term_count = (last_year - first_year) * 2
        transcript_data['term_count'] = term_count
    else:
        transcript_data['term_count'] = 0
    
    # Print some debug information
    if debug_mode:
        print(f"\nFound {len(transcript_data['courses'])} courses for student {student_id}")
        if transcript_data['courses']:
            print("All courses:")
            for i, course in enumerate(transcript_data['courses']):
                print(f"{i+1}. {course['code']} - {course['name']} - {course['grade']} - {course['term']}")
    
    return transcript_data

def add_course_to_transcript(transcript_data, term, code, name, credit, ects, grade):
    """Add a course to the transcript data after cleaning up the course name"""
    # Clean up the course name
    name = re.sub(r"\d+\s*\|\s*\d+", "", name).strip()
    name = re.sub(r"[A-Z]{2}\(\d+\)", "", name).strip()
    name = re.sub(r"\(EN\)", "", name).strip()
    name = re.sub(r"Açıklama", "", name).strip()
    
    # Clean up whitespace
    name = re.sub(r"\s+", " ", name).strip()
    
    # Calculate grade point
    grade_point = convert_grade_to_point(grade)
    
    # Add to transcript data
    transcript_data['courses'].append({
        'term': term,
        'code': code,
        'name': name,
        'credit': credit,
        'ects': ects,
        'grade': grade,
        'grade_point': grade_point
    })

def convert_grade_to_point(grade):
    """Convert letter grade to numeric point"""
    grade_points = {
        'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5, 
        'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FD': 0.5, 'FF': 0.0, 'S': 0.0
    }
    return str(grade_points.get(grade, 0.0))

def save_to_csv(transcript_data, output_path):
    """Save transcript data to CSV file"""
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile, delimiter=';')
            
            # Write student ID
            writer.writerow(['Student ID', '', '', '', '', '', ''])
            writer.writerow([transcript_data['student_id'], '', '', '', '', '', ''])
            
            # Write header
            writer.writerow(['Term', 'Course Code', 'Course Name', 'Credit', 'ECTS', 'Grade', 'Grade Point'])
            
            # Write courses
            for course in transcript_data['courses']:
                writer.writerow([
                    course['term'],
                    course['code'],
                    course['name'],
                    course['credit'],
                    course['ects'],
                    course['grade'],
                    course['grade_point']
                ])
            
            # Write summary
            writer.writerow([
                '', '', '',
                f"Total Credit: {transcript_data['total_credit']}",
                f"Total ECTS: {transcript_data['total_ects']}", 
                '',
                f"GANO: {transcript_data['gpa']}"
            ])
        return True
    except Exception as e:
        print(f"Error saving CSV: {str(e)}")
        return False

def process_zip_file(zip_path, output_dir):
    """Process all transcript PDFs in a zip file and return a list of processed files"""
    processed_files = []
    
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Create temp directory
        temp_dir = os.path.join(output_dir, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Extract all files
            zip_ref.extractall(temp_dir)
            
            # Process each PDF file
            for filename in os.listdir(temp_dir):
                if filename.lower().endswith('_transcript.pdf'):
                    try:
                        # Extract student ID from filename
                        student_id = filename.split('_')[0]
                        pdf_path = os.path.join(temp_dir, filename)
                        
                        # Extract text from PDF
                        text = extract_text_from_pdf(pdf_path)
                        
                        # Parse transcript
                        transcript_data = parse_transcript(text, student_id)
                        
                        # Save to CSV
                        csv_path = os.path.join(output_dir, f"{student_id}.csv")
                        if save_to_csv(transcript_data, csv_path):
                            processed_files.append(f"{student_id}.csv")
                    except Exception as e:
                        print(f"Error processing {filename}: {str(e)}")
            
            # Clean up temporary directory
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)
    
    except Exception as e:
        print(f"Error processing zip file: {str(e)}")
    
    return processed_files

# Main function to run when called from Java
def main():
    if len(sys.argv) < 3:
        print("Usage: python transcript_parser.py <zip_file_path> <output_directory>")
        return
    
    zip_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    try:
        processed_files = process_zip_file(zip_path, output_dir)
        # Print results (will be captured by Java process)
        print("SUCCESS")
        for file in processed_files:
            print(file)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    main() 