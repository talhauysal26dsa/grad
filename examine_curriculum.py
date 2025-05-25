import PyPDF2
import re

def examine_curriculum_pdf(pdf_path):
    """Extract and examine text from curriculum PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            print(f"Number of pages: {len(pdf_reader.pages)}")
            print("=" * 50)
            
            # Extract text from first few pages to understand structure
            for page_num in range(min(3, len(pdf_reader.pages))):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                print(f"\n--- PAGE {page_num + 1} ---")
                
                # Split into lines and analyze structure
                lines = page_text.split('\n')
                
                for i, line in enumerate(lines):
                    # Look for term information
                    if 'Yarıyıl' in line or 'YARILYI' in line:
                        print(f"TERM FOUND: {line.strip()}")
                    
                    # Look for column headers
                    if 'Ders Kodu' in line and 'Ders Adı' in line:
                        print(f"COLUMNS: {line.strip()}")
                        # Print next few lines to see the data structure
                        for j in range(1, min(10, len(lines) - i)):
                            if lines[i + j].strip():
                                print(f"  DATA: {lines[i + j].strip()}")
                            else:
                                break
                    
                    # Look for course type information
                    if any(word in line.upper() for word in ['ZORUNLU', 'SEÇMELİ', 'ELECTİVE', 'MANDATORY']):
                        print(f"COURSE TYPE: {line.strip()}")
                
                print("-" * 50)
    
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

if __name__ == "__main__":
    examine_curriculum_pdf("2021_2022courses/ceng_curriculum.pdf") 