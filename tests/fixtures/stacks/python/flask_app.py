from flask import Flask
app = Flask(__name__)
@app.route("/orders", methods=["GET", "POST"])
def orders():
    return []
