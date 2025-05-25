import os
import sys
import zipfile
import tempfile
from transcript_parser import extract_text_from_pdf, parse_transcript, save_to_csv, process_zip_file

def create_test_zip(pdf_path, zip_path):
    """Create a test ZIP file with the sample PDF"""
    with zipfile.ZipFile(zip_path, 'w') as zip_file:
        # Get just the filename from the path
        pdf_filename = os.path.basename(pdf_path)
        zip_file.write(pdf_path, pdf_filename)
    
    print(f"Created test ZIP file at {zip_path}")

def test_extract_and_parse(pdf_path, output_csv):
    """Test extracting text from PDF and parsing it"""
    print(f"Testing extraction and parsing of {pdf_path}")
    
    # Extract student_id from filename
    filename = os.path.basename(pdf_path)
    student_id = filename.split('_')[0]
    
    # Extract text from PDF
    print("1. Extracting text from PDF...")
    text = extract_text_from_pdf(pdf_path)
    print(f"   Extracted {len(text)} characters")
    
    # Parse transcript data
    print("2. Parsing transcript data...")
    transcript_data = parse_transcript(text, student_id)
    
    print(f"   Found {len(transcript_data['courses'])} courses")
    print(f"   Total Credit: {transcript_data['total_credit']}")
    print(f"   Total ECTS: {transcript_data['total_ects']}")
    print(f"   GPA: {transcript_data['gpa']}")
    
    # Save to CSV
    print(f"3. Saving to CSV file {output_csv}...")
    save_to_csv(transcript_data, output_csv)
    
    print("Test completed successfully!")
    return transcript_data

def test_zip_file(zip_path):
    """Test processing a zip file directly"""
    print(f"Testing processing of zip file: {zip_path}")
    
    # Create a temp directory for output
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    
    # Process the zip file
    process_zip_file(zip_path, output_dir)
    
    # Print results
    csv_files = [f for f in os.listdir(output_dir) if f.endswith('.csv')]
    print(f"\nProcessed {len(csv_files)} transcript(s). CSV files saved to {output_dir}/")
    for csv_file in csv_files:
        print(f"  - {csv_file}")
    
    return output_dir

def extract_sample_from_zip(zip_path, temp_dir):
    """Extract a sample PDF from the zip file for testing"""
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        pdf_files = [f for f in zip_ref.namelist() if f.lower().endswith('_transcript.pdf')]
        
        if not pdf_files:
            print("No transcript PDF files found in the zip file!")
            return None
        
        # Extract the first PDF file
        sample_pdf_name = pdf_files[0]
        print(f"Extracting sample PDF: {sample_pdf_name}")
        zip_ref.extract(sample_pdf_name, temp_dir)
        
        return os.path.join(temp_dir, sample_pdf_name)

if __name__ == "__main__":
    # Use provided zip file path or look for it in default location
    if len(sys.argv) >= 2:
        zip_path = sys.argv[1]
    else:
        # Default path for the zip file
        zip_path = "zip_transcripts/transcripts.zip"
        # Check if path exists
        if not os.path.exists(zip_path):
            print(f"Could not find the zip file at {zip_path}")
            print("Please provide the path to the zip file as a command-line argument:")
            print("python test_parser.py path/to/transcripts.zip")
            sys.exit(1)
    
    print(f"Using zip file: {zip_path}")
    
    # Create temp directory for extracted files
    with tempfile.TemporaryDirectory() as temp_dir:
        # First test: extract a sample PDF and process it
        sample_pdf = extract_sample_from_zip(zip_path, temp_dir)
        
        if sample_pdf:
            # Create output directory for the sample test
            os.makedirs("test_output", exist_ok=True)
            output_csv = os.path.join("test_output", "test_transcript.csv")
            
            print("\n== TESTING SINGLE PDF EXTRACTION ==")
            transcript_data = test_extract_and_parse(sample_pdf, output_csv)
            
            # Display the first few courses as a sample
            if transcript_data['courses']:
                print("\nSample of parsed courses:")
                for i, course in enumerate(transcript_data['courses'][:3]):
                    print(f"{i+1}. {course['code']} - {course['name']} - {course['grade']}")
                
                if len(transcript_data['courses']) > 3:
                    print(f"... and {len(transcript_data['courses']) - 3} more courses")
        
        # Second test: process the entire zip file
        print("\n== TESTING FULL ZIP PROCESSING ==")
        output_dir = test_zip_file(zip_path)
        
        print("\nAll tests completed!")
        print(f"Single PDF test result: {os.path.abspath('test_output/test_transcript.csv')}")
        print(f"Full zip processing results: {os.path.abspath(output_dir)}") 