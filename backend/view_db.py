"""
GeoHarmonize PostgreSQL + PostGIS Database Inspector Utility
Run from project root:
  python3 backend/view_db.py [table_name]
Example:
  python3 backend/view_db.py
  python3 backend/view_db.py parcels
  python3 backend/view_db.py conflicts
  python3 backend/view_db.py integrated_records
"""

import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://geoharmonize:geoharmonize@127.0.0.1:5435/geoharmonize"
)

def list_summary(conn):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
        ORDER BY table_name;
    """)
    tables = [row["table_name"] for row in cursor.fetchall()]
    
    # Get PostGIS version
    cursor.execute("SELECT PostGIS_Full_Version();")
    pgis_ver = cursor.fetchone()["postgis_full_version"].split()[0]
    
    print("\n" + "=" * 75)
    print(f" GeoHarmonize PostgreSQL + PostGIS Database Inspector")
    print(f" Host: 127.0.0.1:5433 | DB: geoharmonize | PostGIS: {pgis_ver}")
    print("=" * 75)
    print(f"{'Table Name':<25} | {'Row Count':<10} | {'Sample Columns'}")
    print("-" * 75)
    
    for tbl in tables:
        cursor.execute(f"SELECT COUNT(*) AS c FROM {tbl};")
        count = cursor.fetchone()["c"]
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position LIMIT 4;
        """, (tbl,))
        cols = [c["column_name"] for c in cursor.fetchall()]
        cols_str = ", ".join(cols) + ("..." if len(cols) == 4 else "")
        print(f"{tbl:<25} | {count:<10} | {cols_str}")
        
    print("-" * 75)
    print("Tip: Run 'python3 backend/view_db.py <table_name>' to view table data.")
    print("=" * 75 + "\n")

def view_table(conn, table_name, limit=15):
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position;
        """, (table_name,))
        columns_info = cursor.fetchall()
        if not columns_info:
            print(f"Error: Table '{table_name}' does not exist.")
            return

        columns = [c["column_name"] for c in columns_info]
        
        # Check if table has geometry
        has_geom = any("USER-DEFINED" in c["data_type"] or "geometry" in c["column_name"] for c in columns_info)
        
        if has_geom:
            cursor.execute(f"""
                SELECT *, ST_GeometryType(geometry) AS geom_type, ST_AsText(ST_Centroid(geometry)) AS centroid_wkt 
                FROM {table_name} LIMIT {limit};
            """)
        else:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit};")
            
        rows = cursor.fetchall()

        print("\n" + "=" * 90)
        print(f" PostGIS Table: {table_name} (Showing {len(rows)} records)")
        print("=" * 90)
        
        filtered_cols = [c for c in columns if c != "geometry"]
        if has_geom:
            filtered_cols.extend(["geom_type", "centroid_wkt"])
            
        header = " | ".join(f"{c:<18}" for c in filtered_cols[:6])
        print(header)
        print("-" * len(header))
        
        for r in rows:
            line = []
            for col in filtered_cols[:6]:
                val = str(r.get(col, "NULL"))
                if len(val) > 18:
                    val = val[:15] + "..."
                line.append(f"{val:<18}")
            print(" | ".join(line))
            
        print("=" * 90 + "\n")
    except Exception as e:
        print(f"Error reading table '{table_name}': {e}")

if __name__ == "__main__":
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        if len(sys.argv) > 1:
            view_table(conn, sys.argv[1])
        else:
            list_summary(conn)
        conn.close()
    except Exception as e:
        print(f"Error connecting to PostgreSQL + PostGIS at {DATABASE_URL}: {e}")
        sys.exit(1)
