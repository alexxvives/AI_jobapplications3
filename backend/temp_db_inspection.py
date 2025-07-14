#!/usr/bin/env python3
"""
TEMPORARY FILE: Database inspection script
Shows all tables, schemas, and sample data for DBeaver verification
"""

from database_service import db_service
import sqlite3

def inspect_database():
    print("🔍 COMPLETE DATABASE INSPECTION")
    print("=" * 50)
    
    conn = db_service.get_raw_connection()
    cursor = conn.cursor()
    
    # 1. List all tables
    print("\n📋 ALL TABLES IN DATABASE:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    for i, (table_name,) in enumerate(tables, 1):
        print(f"{i:2d}. {table_name}")
    
    print(f"\nTotal tables: {len(tables)}")
    
    # 2. Show detailed schema for each table
    print("\n" + "=" * 50)
    print("🏗️ DETAILED TABLE SCHEMAS:")
    
    for table_name, in tables:
        print(f"\n📊 Table: {table_name}")
        print("-" * 30)
        
        # Get table info
        cursor.execute(f'PRAGMA table_info({table_name})')
        columns = cursor.fetchall()
        
        print(f"Columns ({len(columns)}):")
        for col in columns:
            cid, name, col_type, not_null, default, pk = col
            pk_text = " [PRIMARY KEY]" if pk else ""
            not_null_text = " NOT NULL" if not_null else ""
            default_text = f" DEFAULT {default}" if default else ""
            print(f"  - {name}: {col_type}{not_null_text}{default_text}{pk_text}")
        
        # Get row count
        cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
        row_count = cursor.fetchone()[0]
        print(f"Rows: {row_count}")
        
        # Show sample data if table has rows
        if row_count > 0 and row_count <= 10:
            print("Sample data:")
            cursor.execute(f'SELECT * FROM {table_name} LIMIT 3')
            rows = cursor.fetchall()
            for row in rows:
                print(f"  {row}")
        elif row_count > 10:
            print("Sample data (first 3 rows):")
            cursor.execute(f'SELECT * FROM {table_name} LIMIT 3')
            rows = cursor.fetchall()
            for row in rows:
                # Truncate long values
                truncated_row = []
                for val in row:
                    if isinstance(val, str) and len(val) > 50:
                        truncated_row.append(val[:47] + "...")
                    else:
                        truncated_row.append(val)
                print(f"  {tuple(truncated_row)}")
    
    # 3. Special focus on jobs table
    print("\n" + "=" * 50)
    print("🎯 DETAILED JOBS TABLE ANALYSIS:")
    
    # Jobs by platform
    cursor.execute("SELECT platform, COUNT(*) FROM jobs GROUP BY platform ORDER BY COUNT(*) DESC")
    platforms = cursor.fetchall()
    print("\nJobs by platform:")
    for platform, count in platforms:
        print(f"  {platform or 'Unknown'}: {count} jobs")
    
    # Jobs by company (top 10)
    cursor.execute("SELECT company, COUNT(*) FROM jobs GROUP BY company ORDER BY COUNT(*) DESC LIMIT 10")
    companies = cursor.fetchall()
    print("\nTop 10 companies by job count:")
    for i, (company, count) in enumerate(companies, 1):
        print(f"  {i:2d}. {company}: {count} jobs")
    
    # Recent jobs
    cursor.execute("SELECT title, company, platform, fetched_at FROM jobs ORDER BY fetched_at DESC LIMIT 5")
    recent_jobs = cursor.fetchall()
    print("\nMost recent jobs:")
    for job in recent_jobs:
        title, company, platform, fetched_at = job
        print(f"  - {title} at {company} ({platform}) - {fetched_at}")
    
    # 4. Table relationships
    print("\n" + "=" * 50)
    print("🔗 TABLE RELATIONSHIPS:")
    
    # Check foreign keys
    for table_name, in tables:
        cursor.execute(f'PRAGMA foreign_key_list({table_name})')
        fks = cursor.fetchall()
        if fks:
            print(f"\n{table_name} foreign keys:")
            for fk in fks:
                print(f"  - {fk[3]} → {fk[2]}.{fk[4]}")
    
    conn.close()
    
    print("\n" + "=" * 50)
    print("✅ DATABASE INSPECTION COMPLETE")
    print("\nThis data is ready for DBeaver verification!")

if __name__ == "__main__":
    inspect_database()