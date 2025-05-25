# Transcript Parser

A Python tool to parse student transcripts from PDF files and convert them to CSV format.

## Features

- Extracts data from PDF transcript files
- Handles multi-line course names
- Creates standardized CSV files with student and course information
- Processes multiple files from a ZIP archive

## Requirements

- Python 3.6 or higher
- PyPDF2
- zipfile (built-in)
- re (built-in)
- csv (built-in)
- os (built-in)

## Installation

1. Clone or download this repository
2. Install the required packages:

```bash
pip install PyPDF2
```

## Usage

Run the script by passing the path to a ZIP file containing transcript PDFs:

```bash
python transcript_parser.py path/to/transcripts.zip --output output_directory
```

### Parameters:

- `zip_file`: Path to the ZIP file containing transcript PDFs (required)
- `--output`: Directory where CSV files will be saved (default: "output")

## Input Format

- ZIP file containing PDF transcripts
- Each PDF file should be named as `studentnumber_transcript.pdf` (e.g., 300201100_transcript.pdf)

## Output Format

The parser generates CSV files with the following structure:

1. Student ID (rows 1-2)
2. Column headers (row 3)
3. Course information (rows 4+)
   - Term
   - Course Code
   - Course Name
   - Credit
   - ECTS
   - Grade
   - Grade Point
4. Summary row with total credits, total ECTS, and GPA

## Example

Input: `300201100_transcript.pdf` in a ZIP file  
Output: `300201100.csv` with all parsed transcript data
