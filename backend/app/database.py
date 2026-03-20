# database.py
import os
from databases import Database
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL")

database = Database(
    DATABASE_URL,
    min_size=1,
    max_size=5,
    # Pass asyncpg connection kwargs:
    connect_args={"statement_cache_size": 0}
)