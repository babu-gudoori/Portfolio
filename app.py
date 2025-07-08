# ─── Import Libraries ───────────────────────────────────────────────────────────
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_mail import Mail, Message
from dotenv import load_dotenv
from datetime import datetime
import os
import csv
import random

# ─── Load Environment Variables ─────────────────────────────────────────────────
load_dotenv()

# ─── Flask App Initialization ───────────────────────────────────────────────────
app = Flask(__name__)

# ─── Configuration: Mail ────────────────────────────────────────────────────────
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = app.config['MAIL_USERNAME']
mail = Mail(app)

# ─── CSV Configuration ──────────────────────────────────────────────────────────
CSV_FILE = 'hire_requests.csv'
FIELDNAMES = ['id', 'name', 'email', 'subject', 'message', 'submitted_at']


# ─── Utility Functions ──────────────────────────────────────────────────────────

def ensure_csv_headers():
    """Ensure the CSV file exists and has correct headers, and remove malformed rows."""
    try:
        if not os.path.exists(CSV_FILE):
            with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as f:
                csv.DictWriter(f, fieldnames=FIELDNAMES, quoting=csv.QUOTE_ALL).writeheader()
            return

        with open(CSV_FILE, newline='', encoding='utf-8') as f:
            all_rows = list(csv.reader(f))

        valid_rows = []
        for row in all_rows:
            if row == FIELDNAMES or (row[0] == 'id' and row != FIELDNAMES):
                continue
            if len(row) == len(FIELDNAMES):
                valid_rows.append(row)

        with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            for row in valid_rows:
                writer.writerow(dict(zip(FIELDNAMES, row)))

    except Exception as e:
        print(f"Error cleaning CSV headers: {e}")


def get_next_id():
    """Generate the next unique ID."""
    ensure_csv_headers()
    try:
        with open(CSV_FILE, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            ids = [int(row['id']) for row in reader if row['id'].isdigit()]
            return max(ids, default=0) + 1
    except Exception as e:
        print(f"Error reading CSV for next ID: {e}")
        return 1


def is_duplicate_submission(name, email, subject, message):
    """Prevent duplicate submissions."""
    ensure_csv_headers()
    try:
        with open(CSV_FILE, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if (
                    row.get('name', '').strip().lower() == name.strip().lower() and
                    row.get('email', '').strip().lower() == email.strip().lower() and
                    row.get('subject', '').strip().lower() == subject.strip().lower() and
                    row.get('message', '').strip().lower() == message.strip().lower()
                ):
                    return True
    except Exception as e:
        print(f"Error checking duplicates: {e}")
    return False


# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Render home page with success flag if present."""
    success = request.args.get('success')
    return render_template('index.html', success=success)


@app.route('/submit', methods=['POST'])
def submit():
    """Handle form submission."""
    name = request.form['name']
    email = request.form['email']
    subject = request.form['subject']
    message = request.form['message']
    submitted_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    entry = {
        'id': get_next_id(),
        'name': name,
        'email': email,
        'subject': subject,
        'message': message,
        'submitted_at': submitted_at
    }

    try:
        ensure_csv_headers()

        if not is_duplicate_submission(name, email, subject, message):
            with open(CSV_FILE, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=FIELDNAMES, quoting=csv.QUOTE_ALL)
                writer.writerow(entry)

            # Send email notification
            try:
                msg = Message(
                    subject=f"New Hire Request from {name}",
                    sender=email,
                    recipients=[app.config['MAIL_USERNAME']]
                )
                msg.body = f"""
📩 New Message from Portfolio:

Name: {name}
Email: {email}
Subject: {subject}
Message: {message}
"""
                mail.send(msg)
            except Exception as e:
                print(f"Error sending email: {e}")

    except PermissionError:
        return "Permission denied: Please close the CSV file or check write permissions."
    except Exception as e:
        return f"Unexpected error while saving submission: {str(e)}"

    return redirect(url_for('index', success='true'))


@app.route('/admin-login', methods=['POST'])
def admin_login():
    """Simple admin login."""
    data = request.get_json()
    if (
        data.get("username") == os.getenv("ADMIN_USERNAME") and
        data.get("password") == os.getenv("ADMIN_PASSWORD")
    ):
        try:
            ensure_csv_headers()
            with open(CSV_FILE, newline='', encoding='utf-8') as f:
                requests = [row for row in csv.DictReader(f)]
            return jsonify(success=True, requests=requests)
        except Exception as e:
            return jsonify(success=False, error=str(e))

    return jsonify(success=False)


# ─── Chatbot Endpoint ───────────────────────────────────────────────────────────

CHATBOT_CSV = os.path.join('static', 'chatbot-dataset.csv')
chatbot_responses = []

def load_chatbot_dataset():
    global chatbot_responses
    try:
        with open(CHATBOT_CSV, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            chatbot_responses = list(reader)
    except FileNotFoundError:
        print(f"⚠️ Chatbot dataset not found at {CHATBOT_CSV}")
        chatbot_responses = []

load_chatbot_dataset()

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get("message", "").lower().strip()

    for row in chatbot_responses:
        questions = [q.strip().lower() for q in row.get("question", "").split("||")]
        if any(q in user_input for q in questions):
            answer = row.get("answer", "I'm eager to learn more and get back to you soon!")
            return jsonify(response=f"{answer} 😊 If you want to know anything else, just ask!")

    fallback_responses = [
        "I’m eager to learn more and get back to you soon! Meanwhile, feel free to ask me about Babu’s skills, projects, or contact info. 😊",
        "Hmm, I’m not quite sure about that yet. But I’m always learning! Ask me anything about Babu’s work or how to get in touch. 🌟",
        "I didn’t catch that perfectly, but I’m here to help! Try asking about Babu’s education, skills, or projects. 🚀",
        "I’m still getting smarter every day! If you want, ask me about Babu’s portfolio, contact details, or something else you’re curious about. 🤖"
    ]

    return jsonify(response=random.choice(fallback_responses))


# ─── Project Pages ──────────────────────────────────────────────────────────────

@app.route('/projects/portfolio')
def show_portfolio_project():
    return render_template('projects/portfolio.html')

@app.route('/projects/dashboardvault')
def show_dashboardvault_project():
    return render_template('projects/dashboardvault.html')

@app.route('/projects/ai-chatbot')
def show_aichatbot_project():
    return render_template('projects/ai-chatbot.html')

@app.route('/projects/profitanalysis')
def show_profitanalysis_project():
    return render_template('projects/profitanalysis.html')

@app.route('/projects/storyland')
def show_aiagent_project():
    return render_template('projects/storyland.html')

@app.route('/projects/cricket')
def show_cricket_project():
    return render_template('projects/cricket.html')


# ─── Run Server ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
