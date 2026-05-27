import os
import shutil
from datetime import datetime

def realizar_backup():
    # 1. Obtener la ruta donde está este script (la raíz del proyecto)
    ruta_raiz = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Configurar carpeta maestra de backups
    nombre_maestro_backup = "backups"
    ruta_maestra = os.path.join(ruta_raiz, nombre_maestro_backup)
    
    # Crear la carpeta maestra si no existe
    if not os.path.exists(ruta_maestra):
        os.makedirs(ruta_maestra)
        print(f"Directorio maestro creado: {nombre_maestro_backup}")

    # 3. Generar nombre de la subcarpeta con Fecha y Hora
    # Formato: Backup_2024-05-22_15-30-01
    ahora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    nombre_carpeta_instancia = f"Backup_{ahora}"
    ruta_destino_final = os.path.join(ruta_maestra, nombre_carpeta_instancia)

    print(f"Creando copia de seguridad en: {nombre_carpeta_instancia}...")

    # 4. Lista de carpetas o archivos a ignorar (para no hacer copias infinitas)
    ignorar = [nombre_maestro_backup, ".git", "__pycache__", ".pytest_cache", ".venv", "venv"]

    try:
        os.makedirs(ruta_destino_final)
        
        # Recorremos todo lo que hay en la raíz
        for item in os.listdir(ruta_raiz):
            # Si el item está en la lista de ignorados, saltamos
            if item in ignorar:
                continue
            
            ruta_origen_item = os.path.join(ruta_raiz, item)
            ruta_destino_item = os.path.join(ruta_destino_final, item)

            # Si es carpeta, usamos copytree; si es archivo, copy2
            if os.path.isdir(ruta_origen_item):
                shutil.copytree(ruta_origen_item, ruta_destino_item)
            else:
                shutil.copy2(ruta_origen_item, ruta_destino_item)
        
        print("\n" + "="*40)
        print(" ✅ BACKUP REALIZADO CON ÉXITO")
        print("="*40)
        
    except Exception as e:
        print(f"\n ❌ ERROR AL REALIZAR BACKUP: {e}")

if __name__ == "__main__":
    realizar_backup()