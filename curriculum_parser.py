import PyPDF2
import csv
import re
import zipfile
import os
from pathlib import Path
import sys

class CurriculumParser:
    def __init__(self):
        self.term_patterns = [
            r'(\d+)\.\s*YARıYıL',
            r'(\d+)\.\s*Yarıyıl',
            r'(\d+)\.\s*YARILYI',
            r'(\d+)\s*\.\s*Yarıyıl',
        ]
        
        # Pattern to identify course type sections
        self.course_type_patterns = [
            r'ZORUNLU\s*DERSLER',
            r'SEÇMELİ\s*DERSLER',
            r'TEMEL\s*DERSLER',
            r'ALAN\s*DERSLER',
            r'BÖLÜM\s*SEÇMELİ',
            r'TEKNİK\s*SEÇMELİ',
            r'GENEL\s*KÜLTÜR',
            r'ÜNIVERSITE\s*SEÇMELİ'
        ]
        
        # Pattern to match course codes (like CENG111, MATH141, etc.)
        self.course_code_pattern = r'^([A-Z]{2,4}\d{3,4}[A-Z]?)$'
        
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                full_text = ""
                for page in pdf_reader.pages:
                    full_text += page.extract_text() + "\n"
                return full_text
        except Exception as e:
            print(f"Error reading PDF {pdf_path}: {e}")
            return None
    
    def determine_course_type(self, section_header, course_metadata=None):
        """Determine if a course is Mandatory or Elective based on section header and course metadata"""
        # First check course metadata for "Zorunlu" (Mandatory)
        if course_metadata and 'ZORUNLU' in course_metadata.upper():
            return "Mandatory"
        
        # Then check section header
        if not section_header:
            return "Mandatory"  # Default to mandatory
        
        section_upper = section_header.upper()
        
        # Check for elective indicators
        elective_keywords = ['SEÇMELİ', 'ELECTIVE', 'ELT', 'GENEL KÜLTÜR', 'ÜNIVERSITE']
        if any(keyword in section_upper for keyword in elective_keywords):
            return "Elective"
        
        # Check for mandatory indicators
        mandatory_keywords = ['ZORUNLU', 'MANDATORY', 'TEMEL', 'ALAN']
        if any(keyword in section_upper for keyword in mandatory_keywords):
            return "Mandatory"
        
        # Default to mandatory if unsure
        return "Mandatory"
    
    def clean_course_name(self, course_name):
        """Clean course name by removing metadata like 'Zorunlu English'"""
        if not course_name:
            return ""
        
        # Remove common metadata patterns
        metadata_patterns = [
            r'\s+Zorunlu\s+English\s*$',  # " Zorunlu English" at the end
            r'\s+Zorunlu\s*$',           # " Zorunlu" at the end
            r'\s+English\s*$',           # " English" at the end
            r'\s+Seçmeli\s*$',           # " Seçmeli" at the end
            r'\s+SEÇMELİ\s*$',           # " SEÇMELİ" at the end
            r'\s+Turkish\s*$',           # " Turkish" at the end
            r'\s+Türkçe\s*$',            # " Türkçe" at the end
        ]
        
        cleaned_name = course_name
        for pattern in metadata_patterns:
            cleaned_name = re.sub(pattern, '', cleaned_name, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        cleaned_name = re.sub(r'\s+', ' ', cleaned_name).strip()
        
        return cleaned_name
    
    def parse_course_line(self, lines, start_idx):
        """Parse a course from multiple lines starting at start_idx"""
        if start_idx >= len(lines):
            return None, start_idx
        
        current_line = lines[start_idx].strip()
        
        # Check if current line is a course code
        if not re.match(self.course_code_pattern, current_line):
            return None, start_idx + 1
        
        course_code = current_line
        course_name = ""
        course_metadata = ""  # Store metadata for type determination
        credit = ""
        ects = ""
        
        # Look for course name in the next few lines
        idx = start_idx + 1
        
        # Course name might span multiple lines
        while idx < len(lines) and idx < start_idx + 10:
            line = lines[idx].strip()
            
            # If we hit a number pattern, this might be credits/ects info
            if re.match(r'^\d+$', line):
                # This could be Teorik, Uygulama, Laboratuvar, Credit, ECTS
                # We need to find the last two numbers (Credit and ECTS)
                numbers = []
                temp_idx = idx
                
                # Collect consecutive number lines
                while temp_idx < len(lines) and temp_idx < start_idx + 15:
                    temp_line = lines[temp_idx].strip()
                    if re.match(r'^\d+$', temp_line):
                        numbers.append(temp_line)
                        temp_idx += 1
                    else:
                        break
                
                # The last two numbers should be Credit and ECTS
                if len(numbers) >= 2:
                    credit = numbers[-2]
                    ects = numbers[-1]
                
                break
            
            # If we hit another course code, stop collecting course name
            elif re.match(self.course_code_pattern, line):
                break
            
            # If we hit a section header, stop
            elif any(re.search(pattern, line.upper()) for pattern in self.course_type_patterns):
                break
            
            # If we hit table headers, stop
            elif 'Ders Kodu' in line and 'Ders Adı' in line:
                break
            
            # Add to course name if it's not empty and doesn't look like metadata
            elif line and not re.match(r'^[\d\s]+$', line):
                # Store the raw line for metadata analysis
                course_metadata += " " + line
                
                if course_name:
                    course_name += " " + line
                else:
                    course_name = line
            
            idx += 1
        
        # Clean up course name by removing metadata
        course_name = self.clean_course_name(course_name)
        course_name = re.sub(r'\s+', ' ', course_name).strip()
        
        if course_code and course_name:
            return {
                'course_code': course_code,
                'course_name': course_name,
                'course_metadata': course_metadata,
                'credit': credit if credit else '0',
                'ects': ects if ects else '0'
            }, idx
        
        return None, start_idx + 1
    
    def parse_curriculum_text(self, text):
        """Parse curriculum text and extract course information"""
        lines = text.split('\n')
        courses = []
        seen_course_codes = set()  # Track course codes to prevent duplicates
        current_section = "Mandatory"  # Default
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Check for course type section headers
            section_found = False
            for pattern in self.course_type_patterns:
                if re.search(pattern, line.upper()):
                    current_section = self.determine_course_type(line)
                    section_found = True
                    break
            
            if section_found:
                i += 1
                continue
            
            # Skip table headers and other metadata
            if ('Ders Kodu' in line and 'Ders Adı' in line) or \
               'Toplam:' in line or \
               any(re.search(pattern, line.upper()) for pattern in self.term_patterns):
                i += 1
                continue
            
            # Try to parse course information
            course_info, next_i = self.parse_course_line(lines, i)
            if course_info:
                course_code = course_info['course_code']
                
                # Check for duplicates before adding
                if course_code not in seen_course_codes:
                    # Determine course type using both section context and course metadata
                    course_type = self.determine_course_type(current_section, course_info.get('course_metadata', ''))
                    course_info['type'] = course_type
                    
                    # Remove the metadata field before adding to courses
                    course_info.pop('course_metadata', None)
                    courses.append(course_info)
                    seen_course_codes.add(course_code)
                
                i = next_i
            else:
                i += 1
        
        print(f"\nProcessed {len(courses)} unique courses (duplicates removed)")
        return courses
    
    def save_to_csv(self, courses, output_path, department_code):
        """Save courses to CSV file"""
        try:
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['Type', 'Course Code', 'Course Name', 'Credit', 'ECTS']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for course in courses:
                    writer.writerow({
                        'Type': course['type'],
                        'Course Code': course['course_code'],
                        'Course Name': course['course_name'],
                        'Credit': course['credit'],
                        'ECTS': course['ects']
                    })
            
            print(f"Successfully saved {len(courses)} courses to {output_path}")
            return True
        
        except Exception as e:
            print(f"Error saving CSV file {output_path}: {e}")
            return False
    
    def parse_curriculum_pdf(self, pdf_path, output_dir):
        """Parse a single curriculum PDF file"""
        print(f"Processing {pdf_path}...")
        
        # Extract department code from filename
        filename = Path(pdf_path).stem
        if '_curriculum' in filename:
            department_code = filename.replace('_curriculum', '').upper()
        else:
            department_code = filename.upper()
        
        # Extract text from PDF
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return False
        
        # Parse courses
        courses = self.parse_curriculum_text(text)
        
        if not courses:
            print(f"No courses found in {pdf_path}")
            return False
        
        # Save to CSV
        output_filename = f"{department_code}_curriculum.csv"
        output_path = os.path.join(output_dir, output_filename)
        
        return self.save_to_csv(courses, output_path, department_code)
    
    def process_zip_file(self, zip_path, output_dir="curriculum_csv"):
        """Process a ZIP file containing curriculum PDFs"""
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # Extract all PDF files
                extract_dir = "temp_curriculum_extract"
                os.makedirs(extract_dir, exist_ok=True)
                
                pdf_files = [f for f in zip_ref.namelist() if f.lower().endswith('.pdf')]
                
                if not pdf_files:
                    print("No PDF files found in the ZIP archive")
                    return False
                
                print(f"Found {len(pdf_files)} PDF files in ZIP archive")
                
                # Extract PDF files
                for pdf_file in pdf_files:
                    zip_ref.extract(pdf_file, extract_dir)
                
                # Process each PDF
                success_count = 0
                for pdf_file in pdf_files:
                    pdf_path = os.path.join(extract_dir, pdf_file)
                    if self.parse_curriculum_pdf(pdf_path, output_dir):
                        success_count += 1
                
                # Clean up temporary directory
                import shutil
                shutil.rmtree(extract_dir, ignore_errors=True)
                
                print(f"\nProcessing complete: {success_count}/{len(pdf_files)} files processed successfully")
                return success_count > 0
        
        except Exception as e:
            print(f"Error processing ZIP file: {e}")
            return False

def main():
    parser = CurriculumParser()
    
    # Check if command line arguments are provided
    if len(sys.argv) >= 3:
        input_pdf = sys.argv[1]
        output_csv = sys.argv[2]
        
        print(f"Processing {input_pdf} -> {output_csv}")
        
        if os.path.exists(input_pdf):
            # Extract department code from filename
            filename = Path(input_pdf).stem
            if '_curriculum' in filename:
                department_code = filename.replace('_curriculum', '').upper()
            else:
                department_code = filename.upper()
            
            # Extract text from PDF
            text = parser.extract_text_from_pdf(input_pdf)
            if not text:
                print("Failed to extract text from PDF")
                return
            
            # Parse courses
            courses = parser.parse_curriculum_text(text)
            
            if not courses:
                print(f"No courses found in {input_pdf}")
                return
            
            # Save to CSV
            if parser.save_to_csv(courses, output_csv, department_code):
                print(f"Successfully processed {input_pdf} -> {output_csv}")
            else:
                print(f"Failed to save CSV file {output_csv}")
        else:
            print(f"Input file {input_pdf} not found")
    else:
        # Default test behavior
        test_file = "2021_2022courses/ceng_curriculum.pdf"
        if os.path.exists(test_file):
            print("Testing with single curriculum file...")
            parser.parse_curriculum_pdf(test_file, "test_output")
        else:
            print("Test curriculum file not found")
        
        print("\nTo process a ZIP file with multiple curriculums:")
        print("parser.process_zip_file('path/to/curriculums.zip')")
        print("\nUsage: python curriculum_parser.py <input_pdf> <output_csv>")

if __name__ == "__main__":
    main() 