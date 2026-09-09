import os
import psycopg
from dotenv import load_dotenv

load_dotenv()
with psycopg.connect(os.environ['DATABASE_URL']) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        rows = cur.fetchall()
        print("Existing tables in DB:", [r[0] for r in rows])
        
        try:
            cur.execute("SELECT app, name, applied FROM django_migrations ORDER BY applied DESC LIMIT 30;")
            print("\nRecent applied migrations in DB:")
            for r in cur.fetchall():
                print(" ", r)
        except Exception as e:
            print("Error checking django_migrations:", e)
