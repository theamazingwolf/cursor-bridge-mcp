#!/usr/bin/env python3
import PyPDF2
import sys

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        return '\n'.join(page.extract_text() for page in reader.pages)

if __name__ == '__main__':
    print(extract_text(sys.argv[1]))
