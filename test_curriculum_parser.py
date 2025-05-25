from curriculum_parser import CurriculumParser
import os

def test_curriculum_parser():
    """Test the curriculum parser with the provided file"""
    parser = CurriculumParser()
    
    # Test with the CENG curriculum file
    test_file = "2021_2022courses/ceng_curriculum.pdf"
    
    if not os.path.exists(test_file):
        print(f"Test file {test_file} not found!")
        return
    
    print(f"Testing curriculum parser with {test_file}")
    print("=" * 50)
    
    # Extract text first to see what we're working with
    print("Extracting text from PDF...")
    text = parser.extract_text_from_pdf(test_file)
    
    if not text:
        print("Failed to extract text from PDF")
        return
    
    print(f"Extracted text length: {len(text)} characters")
    
    # Show a sample of the text
    lines = text.split('\n')
    print(f"Total lines: {len(lines)}")
    
    print("\nFirst 20 lines of extracted text:")
    for i, line in enumerate(lines[:20]):
        print(f"{i+1:2d}: {line}")
    
    print("\nParsing courses...")
    courses = parser.parse_curriculum_text(text)
    
    print(f"Found {len(courses)} courses")
    
    if courses:
        print("\nFirst 10 courses:")
        for i, course in enumerate(courses[:10]):
            print(f"{i+1:2d}. {course['type']} | {course['course_code']} | {course['course_name']} | Credit: {course['credit']} | ECTS: {course['ects']}")
        
        # Create output directory and save CSV
        output_dir = "test_curriculum_output"
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\nSaving to CSV...")
        success = parser.save_to_csv(courses, os.path.join(output_dir, "CENG_curriculum.csv"), "CENG")
        
        if success:
            print("Successfully saved CSV file!")
        else:
            print("Failed to save CSV file")
    else:
        print("No courses found - debugging needed")
        
        # Look for specific patterns in the text
        print("\nLooking for course codes in text...")
        import re
        course_pattern = r'^([A-Z]{2,4}\d{3,4}[A-Z]?)$'
        
        for i, line in enumerate(lines):
            if re.match(course_pattern, line.strip()):
                print(f"Course code found at line {i+1}: {line.strip()}")
                # Show context
                for j in range(max(0, i-2), min(len(lines), i+5)):
                    print(f"  {j+1}: {lines[j]}")
                print()

if __name__ == "__main__":
    test_curriculum_parser() 