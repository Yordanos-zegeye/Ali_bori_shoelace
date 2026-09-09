import os
import psycopg
from dotenv import load_dotenv

load_dotenv()
with psycopg.connect(os.environ['DATABASE_URL'].replace('-pooler', '')) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT pid, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE datname = 'neondb' AND pid != pg_backend_pid();")
        rows = cur.fetchall()
        for r in rows:
            print(r[0], r[1], r[2], r[3], (r[4][:90] if r[4] else 'None'))
