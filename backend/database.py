"""
database.py
Camada simples de acesso a dados usando SQLite.
Guarda incidentes/soluções da Knowledge Base e os tickets atribuídos a cada utilizador.
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
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'Atribuído',
            priority TEXT DEFAULT 'Média',
            assigned_to TEXT NOT NULL,
            source_system TEXT DEFAULT 'Remedy',
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

    # Tickets de demonstração (atribuídos ao utilizador fictício "DEMO").
    # Serão substituídos por tickets reais quando existir o conector do Remedy.
    cursor.execute("SELECT COUNT(*) as total FROM tickets")
    if cursor.fetchone()["total"] == 0:
        demo_tickets = [
            (
                "INC000000100001",
                "Utilizador sem acesso ao Service Desk",
                "Cliente reporta erro 401 ao abrir o portal depois da renovação da palavra-passe.",
                "Atribuído",
                "Alta",
                "DEMO",
            ),
            (
                "INC000000100002",
                "Timeout na integração com o Remedy",
                "Chamadas à API demoram mais de 30s em horário de pico.",
                "Em curso",
                "Crítica",
                "DEMO",
            ),
            (
                "INC000000100003",
                "Pedido de acesso ao repositório GitLab",
                "Novo colaborador precisa de acesso de leitura ao grupo de inovação.",
                "Pendente",
                "Baixa",
                "DEMO",
            ),
            (
                "INC000000100004",
                "Extensão do browser não carrega no Edge",
                "Política da empresa bloqueia o modo de programador.",
                "Atribuído",
                "Média",
                "DEMO",
            ),
        ]
        cursor.executemany(
            """
            INSERT INTO tickets (ticket_id, title, description, status, priority, assigned_to)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            demo_tickets,
        )
        conn.commit()

    conn.close()
