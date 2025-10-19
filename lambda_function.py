import boto3
import json
import os
from botocore.exceptions import ClientError
from anthropic import Anthropic
from datetime import datetime

client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
)

model_fast = "claude-3-5-haiku-20241022"
model_comprehensive = "claude-3-5-sonnet-20241022"

filename_generation_prompt = """
    <task>
    Generate a filename that best summarizes the input file content, you should
    first guess the file type based on the content and use one of the following
    filename generation rules below (a default one is provided as fallback).
    </task>

    <global_rules>
    Your response must follow the following rules:
    1. Your response should only include the final filename without any other conversational messages or explanations.
    2. You MUST identify the primary language used in the file content (e.g. English, Simplified Chinese, Japanese, Spanish, French, etc). Output the filename in that language. 
    3. Use only " - " as the separator.
    </global_rules>

    <research_paper>
    If the file content appears to be an academic or research paper, try find the title, first author's last name, and specific research area for this paper, be sure to exclude books from papers, then use this format:
    Format: {Shortened Title} - {First Author's Last Name} - {Research Area}
    Example 1: Therapeutic Enzyme Engineering Using A Generative Neural Network - Giessel - Protein Engineering
    Example 2: Attention is All You Need - Vaswani - LLM
    Example 3: Smart Institutions, Foolish Choices - Lerner - Asset Management
    </research_paper>

    <book>
    If the file content appears to be a book, try to find the title of the book,
    first author's name, then use this format:
    Format: {Book Title} - {First Author's Last Name}
    Example 1: Pioneering Portfolio Management: An Unconventional Approach to Institutional Investment - David F. Swensen
    Example 2: High Output Management - Andrew Grove
    Example 3: 負けヒロインが多すぎる！ ３ - 雨森たきび
    </book>

    <financial_report>
    If the file content appears to be a financial report, try to find the company name, the financial report type or title, and the reporting period, then use this format: 
    Format: {Company} - {Document Type} - {Period}
    Example 1: Apple - IPO Prospectus - 19801212
    Example 2: Google - 10-Q - 2023Q3
    Example 3: 特海國際 - 上市文件 - 20221219
    Exmaple 4: 20250112 - Inditex - Resultados Consolidados - 1H2024
    </financial_report>

    <course_material>
    If the file content appears to be a course material, such as syllabus, lecture notes, study guides, assignments, group projects, labs, quizzes, reading lists, practice exams, etc. Try to find the course name and code, file type, material id, instructor name, term, then use this format:
    Format: {Course Code} - {Material Type} - {Material ID If Exists} - {Course Title If Exists} - {Term If Exists}
    Example 1: CS224N - Assignment - 20240222 - Intermediate Python - Spring 2024
    Example 2: CS111 - Final Example Study Guide - Summer 2024
    Example 3: Math131B - Lecture Notes - 2 - Real Analysis - Fall 2019 
    </course_material>

    <industry_report>
    If the file content appears to be an industry report, such as macro economy, market, company, or product analysis, try to find the company/product/industry of target, the publisher, and the publication/release date, then use this format:
    Format: {Research Target Product/Company/Industry} - {Report Type} - {Publisher} - {Release Date}
    Example 1: Europe Renewable Energy - Market Analysis - BCG - 2010 to 2020
    Example 2: 王者荣耀 - 游戏测评 - 小袁 - 202005
    Example 3: Netflix - Valuation - Goldman Sachs - 2023
    </industry_report>

    <legal_document>
    If the file content appears to be legal document or contract (e.g. lease), try to find the document type, the two or multiple parties involved, the document date, and any current status, then use this format:
    Format: {Document Type} - {First Party} - {Second Party} - {Date} - {Status If Exists}
    Example 1: NDA - Tecent - Empty - 20240315 - Incomplete
    Example 2: Lease - Michael - Irvine Apartment Co - 20240101 - Signed
    Example 3: Postmoney SAFE - Empty - Empty - Template
    </legal_document>

    <interview>
    If the file content appears to be about an interview (e.g. with Steve Jobs), try to find the interviewer name, interviewee name, interview type, and 2-7 words summarize the main topic for this interview, then use this format:
    Format: {First Participating Party} - {Second Participating Party} - {Topic} - Interview
    Example 1: Steve Jobs - CNBC - Apple's Transformation - Interview
    Example 2: Ao Jiao - Michael Wang - Personal Growth During Economic Depression - Interview
    Example 3: 袁赛特 - 马化腾 - 游戏投资 - 采访
    </interview>

    <technical_documentation>
    If the file content appears to be a technical design doc, one-pager, user guide, PRD, or other documentations used in a tech company setting, try find the type of this document (e.g. design doc vs prd vs user guide vs testing doc), what product is it talking about, version, release date, then use this format:
    Format: {Product} - {Version If Exists} - {Document Type} - {Date of Release}
    Example 1: PostgreSQL - 14.2 - Installation Guide - 202403
    Example 2: Google Search - V1 - High Level Design Doc - 19990101
    </technical_documentation>

    <default>
    If the file content doesn't match any of the file types above, try to guess an approriate file type and generate 3 to 5 keywords that best summarize the main points in the file, then use this format:
    Format: {file type} - {Keyword1} - {Keyword2} - {Keyword3}
    </default>
"""

user_preference_prompt = """
    <Task>
    Add input date to filename, output only the new filename string without explanation.
    If filename_format equals {filename}, output original filename.

    Input fields:
    - filename: Original filename
    - local_time: User's local time (YYYY-MM-DD)
    - date_format: Preferred date format (YYYYMMDD, MMDDYYYY, YYYY-MM-DD, MM-DD-YYYY, NO_DATE)  
    - filename_format: Template for combining ({date} - {filename} or {filename} - {date} or {filename})
    </Task>

    <Output>
    Single filename string
    </Output>

    <Example>
    Example input: filename: Doc.txt, local_time: 2024-01-01, date_format: YYYYMMDD, filename_format: {date} - {filename}
    Example output: 20240101 - Doc.txt

    Example input: filename: Doc.txt, local_time: 2024-01-01, date_format: YYYYMMDD, filename_format: {filename} - {date}
    Example output: Doc.txt - 20240101

    Example input: filename: Doc.txt, local_time: 2024-01-01, date_format: YYYYMMDD, filename_format: {filename}
    Example output: Doc.txt
    </Example>
"""


def generate_settings(date_format, local_time, filename_format):
    return f"""
        date_format: {date_format}
        local_time: {local_time}
        filename_format: {filename_format}
        """


def lambda_handler(event, context):
    request = event['body']
    body = json.loads(request)
    file_content = body.get('text')

    date_format = body.get('date_format')
    local_time = body.get('local_time')
    filename_format = body.get('filename_format')

    allowed_filename_formats = [
        '{filename} - {date}',
        '{date} - {filename}',
        '{filename}',
    ]

    format_mapping = {
        'YYYYMMDD': '%Y%m%d',
        'MMDDYYYY': '%m%d%Y',
        'YYYY-MM-DD': '%Y-%m-%d',
        'MM-DD-YYYY': '%m-%d-%Y',
    }

    if not file_content:
        return {
            'statusCode': 500,
            'body': {
                'message': 'File content cannot be empty',
                'error': True
            }
        }

    if not local_time:
        return {
            'statusCode': 500,
            'body': {
                'message': 'Local time cannot be empty',
                'error': True
            }
        }

    if not date_format or date_format not in format_mapping:
        return {
            'statusCode': 500,
            'body': {
                'message': 'Date format empty or invalid',
                'error': True
            }
        }

    if not filename_format or filename_format not in allowed_filename_formats:
        return {
            'statusCode': 500,
            'body': {
                'message': 'Filename format empty or invalid',
                'error': True
            }
        }

    user_setting = generate_settings(date_format, local_time, filename_format)

    filename_request = client.messages.create(
        model=model_comprehensive,
        max_tokens=2048,
        temperature=0.3,
        messages=[
            {"role": "assistant", "content": filename_generation_prompt},
            {"role": "user", "content": file_content},
        ]
    )

    output_response = filename_request.content[0].text
    if not filename_request:
        print(f"ERROR: Anthropic filename user preference error: {filename_request}")
        return {
            'statusCode': 500,
            'body': {
                'message': 'Anthropic filename user preference generation error',
                'error': True
            }
        }
    
    parsed_date = datetime.strptime(local_time, '%Y-%m-%d')
    formatted_date = parsed_date.strftime(format_mapping[date_format])
    formatted_string = output_response
    if filename_format == '{filename} - {date}':
        formatted_string = f"{output_response} - {formatted_date}" 
    elif filename_format == '{date} - {filename}':
        formatted_string = f"{formatted_date} - {output_response}"


    return {
        'statusCode': 200,
        'body': str.strip(formatted_string)
    }
