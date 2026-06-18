# PyMySQL lets this project run with MySQL without requiring mysqlclient system packages.
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except Exception:
    pass
