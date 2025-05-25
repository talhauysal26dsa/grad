# Transcript Parser Usage Guide

This document provides detailed instructions for using the transcript parser to convert PDF transcripts to CSV format.

## Installation

1. Make sure you have Python 3.6 or newer installed on your system.

2. Install the required packages:
   ```bash
   pip install PyPDF2
   ```

3. Download or clone the repository to your local machine.

## Basic Usage

### 1. Preparing Your Files

The parser is designed to work with a ZIP file containing student transcript PDFs. Each PDF file should follow this naming convention:
```
studentnumber_transcript.pdf
```

For example:
- `290201071_transcript.pdf`
- `300201100_transcript.pdf`

### 2. Running the Parser

To process a ZIP file containing transcripts:

```bash
python transcript_parser.py path/to/transcripts.zip --output output_directory
```

For example:
```bash
python transcript_parser.py transcripts.zip --output parsed_transcripts
```

This will:
1. Extract all PDF files from `transcripts.zip`
2. Parse each transcript PDF
3. Create a corresponding CSV file for each transcript
4. Save the CSV files to the `parsed_transcripts` directory

### 3. Testing with a Single PDF

To test the parser with a single PDF file:

```bash
python test_parser.py path/to/sample.pdf
```

For example:
```bash
python test_parser.py samples/290201071_transcript.pdf
```

This will:
1. Extract and parse the sample PDF
2. Create a test CSV file in the `test_output` directory
3. Create a test ZIP file for further testing

## Output Format

Each generated CSV file follows this structure:

```
Student ID;;;;;;
studentnumber;;;;;;
Term;Course Code;Course Name;Credit;ECTS;Grade;Grade Point
2021-2022 Fall;CENG111;Concepts of Computer Engineering;3;5;DD;1
2021-2022 Fall;CENG113;Introduction to Programming;4;6;BA;3.5
...
;;;Total Credit: 126;Total ECTS: 211;;GANO: 1.82
```

## Troubleshooting

### PDF Extraction Issues

If you encounter issues with the PDF text extraction:

1. Make sure the PDF is not encrypted or password-protected
2. Check if the PDF contains actual text (not just images of text)
3. For scanned documents, you may need to use OCR (Optical Character Recognition) first

### Parsing Issues

If course information is not being correctly parsed:

1. Check if the transcript format matches the expected format
2. Try adjusting the regular expressions in the `parse_transcript` function
3. Look for errors in the console output for specific issues

## Advanced Usage

### Processing Multiple ZIP Files

To process multiple ZIP files, you can use a simple shell script:

```bash
#!/bin/bash
for zipfile in *.zip; do
  python transcript_parser.py "$zipfile" --output "output_${zipfile%.zip}"
done
```

### Customizing the Parser

If you need to customize the parser for a different transcript format:

1. Open `transcript_parser.py`
2. Modify the regular expression patterns in the `parse_transcript` function
3. Adjust the `process_course_match` function as needed

## Example

Input file: `290201071_transcript.pdf`

Output: `290201071.csv` containing course information in the standardized format.

## Support

If you encounter any issues or have questions, please:

1. Check the troubleshooting section above
2. Review the error messages for clues
3. Submit an issue on the repository with a clear description and example 