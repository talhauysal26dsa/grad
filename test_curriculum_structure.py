import PyPDF2

def extract_curriculum_text(pdf_path):
    """Extract raw text from curriculum PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            print(f"Number of pages: {len(pdf_reader.pages)}")
            print("=" * 50)
            
            # Extract text from first page only
            if len(pdf_reader.pages) > 0:
                page_text = pdf_reader.pages[0].extract_text()
                lines = page_text.split('\n')
                
                print("First page content:")
                for i, line in enumerate(lines[:50]):  # First 50 lines
                    print(f"{i+1:2d}: {line}")
                
                print("\n" + "=" * 50)
                print("Looking for patterns...")
                
                # Look for specific patterns
                for i, line in enumerate(lines):
                    if 'Yarıyıl' in line.upper() or 'YARILYI' in line.upper():
                        print(f"Term header found at line {i+1}: {line}")
                    if 'Ders Kodu' in line and 'Ders Adı' in line:
                        print(f"Column header found at line {i+1}: {line}")
                        # Show next few lines
                        for j in range(1, min(5, len(lines)-i)):
                            if lines[i+j].strip():
                                print(f"  -> {lines[i+j]}")
                        print()
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_curriculum_text("2021_2022courses/ceng_curriculum.pdf") 