"""
app.py
API Flask para a Knowledge Base + Chatbot de troubleshooting.

Endpoints:
    GET  /api/health              -> healthcheck
    GET  /api/incidents           -> lista todos os incidentes
    POST /api/incidents           -> cria um novo incidente/solução
    GET  /api/search?q=termo      -> busca incidentes por palavra-chave
    POST /api/chat                -> chatbot simples baseado em keyword-matching
"""
from flask import Flask, request, jsonify
from flask_cors import CORS

from database import get_connection, init_db, seed_if_empty

app = Flask(__name__)
# CORS liberado para a extensão de navegador poder chamar a API localmente.
CORS(app)


def row_to_dict(row):
    return dict(row)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "chatbot-troubleshooting-api"})


@app.route("/api/incidents", methods=["GET"])
def list_incidents():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM incidents ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/incidents", methods=["POST"])
def create_incident():
    data = request.get_json(force=True) or {}

    required_fields = ["title", "description", "solution"]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify({"error": f"Campos obrigatórios em falta: {', '.join(missing)}"}), 400

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO incidents (title, description, solution, source_system, tags)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data["title"],
            data["description"],
            data["solution"],
            data.get("source_system", "Manual"),
            data.get("tags", ""),
        ),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({"message": "Incidente criado com sucesso", "id": new_id}), 201


@app.route("/api/search", methods=["GET"])
def search_incidents():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    like_term = f"%{query}%"
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT * FROM incidents
        WHERE title LIKE ? OR description LIKE ? OR tags LIKE ? OR solution LIKE ?
        ORDER BY created_at DESC
        """,
        (like_term, like_term, like_term, like_term),
    ).fetchall()
    conn.close()

    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chatbot simples: faz keyword-matching contra a Knowledge Base
    e devolve a solução mais relevante encontrada.
    Isto é um ponto de partida - pode ser substituído por um
    modelo de linguagem (ex: API da Anthropic) mais à frente.
    """
    data = request.get_json(force=True) or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"reply": "Por favor, escreve a tua pergunta sobre o incidente."})

    conn = get_connection()
    rows = conn.execute("SELECT * FROM incidents").fetchall()
    conn.close()

    message_words = set(message.lower().split())
    best_match = None
    best_score = 0

    for row in rows:
        haystack = f"{row['title']} {row['description']} {row['tags']}".lower()
        score = sum(1 for word in message_words if word in haystack)
        if score > best_score:
            best_score = score
            best_match = row

    if best_match and best_score > 0:
        reply = (
            f"Encontrei um incidente parecido: '{best_match['title']}'.\n\n"
            f"Solução sugerida: {best_match['solution']}"
        )
        return jsonify(
            {
                "reply": reply,
                "matched_incident": row_to_dict(best_match),
            }
        )

    return jsonify(
        {
            "reply": "Não encontrei nada parecido na Knowledge Base. "
            "Queres registar este caso como um novo incidente?"
        }
    )


if __name__ == "__main__":
    init_db()
    seed_if_empty()
    app.run(debug=True, port=5000)
