from databases import Database
import os

DATABASE_URL = os.getenv("DATABASE_URL")
database = Database(DATABASE_URL)

# Disable asyncpg prepared statements to work with PgBouncer
database = Database(
    DATABASE_URL,
    connect_args={"statement_cache_size": 0}
)