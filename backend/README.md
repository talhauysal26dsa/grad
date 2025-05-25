# Transcript Parser Integration

This project integrates a Python-based transcript parser with a Spring Boot backend to process and convert transcript PDFs to CSV format.

## Prerequisites

1. **Java 17** or higher
2. **Python 3.6+** installed on the system
3. **PyPDF2** Python library (will be installed automatically on startup)

## How It Works

The integration works as follows:

1. When a ZIP file containing transcript PDFs is uploaded through the frontend
2. The ZIP file is processed by the backend
3. The backend calls the Python script to extract text from PDFs and parse the transcripts
4. The Python script creates CSV files from the parsed transcripts
5. The backend reads the CSV files and updates the database with student information

## Setup Instructions

1. Make sure Python 3.x is installed on your system
2. Start the Spring Boot application, which will automatically check and install required Python dependencies
3. Access the frontend at http://localhost:5173 and use the Import Transcript functionality

## Troubleshooting

- If you encounter issues with Python detection, make sure Python is in your system PATH
- Check logs for detailed error messages
- Ensure PyPDF2 is installed (`pip install PyPDF2==3.0.1`)

## File Structure

- `backend/src/main/resources/transcript_parser.py` - The Python script that processes transcripts
- `backend/src/main/resources/requirements.txt` - Python dependencies
- `backend/src/main/java/com/example/demo/service/TranscriptParserService.java` - Java service that interfaces with Python
- `backend/src/main/java/com/example/demo/controller/TranscriptController.java` - REST controller for transcript uploads 