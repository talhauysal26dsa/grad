import os
import re
import csv
import zipfile
import PyPDF2
from io import StringIO

def extract_text_from_pdf(pdf_path):
    """Extract text content from a PDF file"""
    text = ""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

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
    
    # Find term sections in the text
    term_sections = []
    current_term = ""
    term_start_index = -1
    
    # Regular expressions
    term_pattern = r"(\d{4}-\d{4})\s+(?:Yılı\s+)?(Güz|Bahar|Fall|Spring)\s+(?:Dönemi)?"
    course_code_pattern = r"^([A-Z]+\d+)$"
    credit_ects_pattern = r"(\d+)\s*\|\s*(\d+)"
    grade_pattern = r"([A-Z]{2})\((\d+)\)"
    gpa_pattern = r"(?:AGNO|GANO|GPA|GNO)\s*:?\s*(\d+[\.,]\d+)"
    
    # First, identify term sections
    for i, line in enumerate(lines):
        term_match = re.search(term_pattern, line)
        if term_match:
            if term_start_index != -1:
                # Save the previous section
                term_sections.append((current_term, term_start_index, i))
            
            # Start a new section
            year = term_match.group(1)
            semester = term_match.group(2)
            semester_map = {"Güz": "Fall", "Bahar": "Spring"}
            if semester in semester_map:
                semester = semester_map[semester]
            current_term = f"{year} {semester}"
            term_start_index = i
    
    # Add the last section
    if term_start_index != -1:
        term_sections.append((current_term, term_start_index, len(lines)))
    
    # Compute term_count ( (last term year - first term year) * 2 )
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
    
    # Process each term section
    for term, start_idx, end_idx in term_sections:
        section_lines = lines[start_idx:end_idx]
        
        # Find all course codes in this section
        i = 0
        while i < len(section_lines):
            if re.match(course_code_pattern, section_lines[i]):
                course_code = section_lines[i]
                course_name = ""
                credit = ""
                ects = ""
                grade = ""
                
                # Look ahead for course name, credit/ECTS, and grade
                j = i + 1
                while j < len(section_lines):
                    line = section_lines[j]
                    
                    # Check if this line contains credit/ECTS
                    credit_match = re.search(credit_ects_pattern, line)
                    if credit_match:
                        credit = credit_match.group(1)
                        ects = credit_match.group(2)
                        
                        # Look for grade in the same line or next line
                        grade_match = re.search(grade_pattern, line)
                        if grade_match:
                            grade = grade_match.group(1)
                            # We found everything we need
                            break
                        elif j + 1 < len(section_lines):
                            # Check next line for grade
                            grade_match = re.search(grade_pattern, section_lines[j+1])
                            if grade_match:
                                grade = grade_match.group(1)
                                j += 1  # Skip the next line since we've processed it
                                break
                    
                    # If we haven't found credit/ECTS/grade yet, this line is part of the course name
                    if not credit and not grade:
                        if course_name:
                            course_name += " " + line
                        else:
                            course_name = line
                    
                    j += 1
                
                # If we found all the required information, add the course
                if course_code and course_name and credit and ects and grade:
                    add_course_to_transcript(transcript_data, term, course_code, course_name, credit, ects, grade)
                
                # Move to the next potential course code
                i = j + 1
            else:
                i += 1
        
        # Look for GPA in this section
        for line in section_lines:
            gpa_match = re.search(gpa_pattern, line)
            if gpa_match:
                gpa_str = gpa_match.group(1).replace(',', '.')
                transcript_data['gpa'] = gpa_str
    
    # If we didn't find any courses, try an alternative approach
    if not transcript_data['courses']:
        # Try to extract courses in a more direct way
        course_blocks = re.findall(
            r"([A-Z]+\d+)\s+([A-ZÇĞİÖŞÜıçğöşü\s\w&\-\(\)\.]+?)\s+(\d+)\s*\|\s*(\d+)\s+([A-Z]{2})\(\d+\)",
            text
        )
        
        for block in course_blocks:
            course_code = block[0]
            course_name = block[1].strip()
            credit = block[2]
            ects = block[3]
            grade = block[4]
            
            # Find the term for this course
            course_term = "Unknown"
            for term, _, _ in term_sections:
                if text.find(course_code) > text.find(term):
                    course_term = term
                    break
            
            add_course_to_transcript(transcript_data, course_term, course_code, course_name, credit, ects, grade)
    
    # Calculate total credit and ECTS
    for course in transcript_data['courses']:
        transcript_data['total_credit'] += int(course['credit'])
        transcript_data['total_ects'] += int(course['ects'])
    
    # If we didn't find GPA, calculate it from courses
    if float(transcript_data['gpa']) == 0.0 and transcript_data['courses']:
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
    
    # Print some debug information
    print(f"Found {len(transcript_data['courses'])} courses for student {student_id}")
    if transcript_data['courses']:
        print("First few courses:")
        for i, course in enumerate(transcript_data['courses'][:3]):
            print(f"{i+1}. {course['code']} - {course['name']} - {course['grade']}")
    
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

def process_zip_file(zip_path, output_dir):
    """Process all transcript PDFs in a zip file"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        # Extract all files to a temporary directory
        temp_dir = os.path.join(output_dir, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        zip_ref.extractall(temp_dir)
        
        # Process each PDF file
        for filename in os.listdir(temp_dir):
            if filename.lower().endswith('_transcript.pdf'):
                try:
                    # Extract student ID from filename
                    student_id = filename.split('_')[0]
                    pdf_path = os.path.join(temp_dir, filename)
                    
                    print(f"Processing {filename}...")
                    
                    # Extract text from PDF
                    text = extract_text_from_pdf(pdf_path)
                    
                    # Write the extracted text to a file for debugging
                    with open(os.path.join(output_dir, f"{student_id}_text.txt"), 'w', encoding='utf-8') as f:
                        f.write(text)
                    
                    # Parse transcript
                    transcript_data = parse_transcript(text, student_id)
                    
                    # Save to CSV
                    csv_path = os.path.join(output_dir, f"{student_id}.csv")
                    save_to_csv(transcript_data, csv_path)
                    print(f"Successfully processed {filename} -> {student_id}.csv")
                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")
        
        # Clean up temporary directory
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
        os.rmdir(temp_dir)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Process transcript PDFs and convert to CSV')
    parser.add_argument('zip_file', help='Path to the zip file containing transcript PDFs')
    parser.add_argument('--output', default='output', help='Output directory for CSV files')
    
    args = parser.parse_args()
    
    process_zip_file(args.zip_file, args.output)
    print(f"All transcripts processed. CSV files saved to {args.output}/")

if __name__ == "__main__":
    main() 