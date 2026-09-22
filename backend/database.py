"""
database.py
Camada simples de acesso a dados usando SQLite.
Guarda incidentes/soluções da Knowledge Base.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "kb.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Cria a tabela de incidentes caso ainda não exista."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            solution TEXT NOT NULL,
            source_system TEXT DEFAULT 'Manual',
            tags TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def seed_if_empty():
    """Popula a base com alguns exemplos, apenas se estiver vazia."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM incidents")
    total = cursor.fetchone()["total"]

    if total == 0:
        sample_data = [
            (
                "Erro 'fatal: refusing to merge unrelated histories'",
                "Ocorre ao dar git pull entre repositórios com históricos diferentes.",
                "Executar 'git pull origin main --allow-unrelated-histories' e resolver conflitos manualmente.",
                "GitLab",
                "git,merge,histórico",
            ),
            (
                "Timeout ao conectar no Remedy",
                "Chamadas à API do Remedy demoram e retornam timeout durante horário de pico.",
                "Aumentar timeout do client para 30s e implementar retry exponencial (3 tentativas).",
                "Remedy",
                "timeout,api,remedy",
            ),
            (
                "Falha de autenticação no Service Desk",
                "Token expirado causa erro 401 nas integrações automatizadas.",
                "Configurar renovação automática do token via refresh_token antes da expiração.",
                "Service Desk",
                "auth,401,token",
            ),
        ]
        cursor.executemany(
            """
            INSERT INTO incidents (title, description, solution, source_system, tags)
            VALUES (?, ?, ?, ?, ?)
            """,
            sample_data,
        )
        conn.commit()

    conn.close()
