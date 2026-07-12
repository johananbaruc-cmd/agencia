# Agencia

Sistema web **Full Stack** desarrollado con un frontend en React y un backend en Python utilizando FastAPI.  
El proyecto utiliza PostgreSQL como base de datos ejecutándose mediante Docker.

---

# Estructura del proyecto

```text
agencia/
│
├── frontend/              # Aplicación web React
│
├── backend/               # API Backend FastAPI
│   ├── app/
│   ├── migrations/
│   ├── uploads/
│   ├── requirements.txt
│   └── venv/
│
├── docker-compose.yml     # Configuración PostgreSQL Docker
│
├── .gitignore
│
└── README.md
```

---

# Tecnologías utilizadas

## Frontend

- React
- Vite
- JavaScript
- CSS

## Backend

- Python
- FastAPI
- Uvicorn
- Alembic

## Base de datos

- PostgreSQL
- Docker

## Control de versiones

- Git
- GitHub

---

# Requisitos del sistema

Antes de ejecutar el proyecto instalar:

- Git
- Node.js
- npm
- Python 3
- Docker
- Docker Compose

Verificar instalaciones:

```bash
git --version
```

```bash
node -v
```

```bash
npm -v
```

```bash
python --version
```

```bash
docker --version
```

---

# Clonar el repositorio

Clonar el proyecto:

```bash
git clone https://github.com/johananbaruc-cmd/agencia.git
```

Entrar a la carpeta:

```bash
cd agencia
```

---

# Configuración del Backend

Entrar a la carpeta backend:

```bash
cd backend
```

---

## Crear entorno virtual

Crear el entorno virtual de Python:

```bash
python -m venv venv
```

---

## Activar entorno virtual

### Fish Shell (Linux)

```bash
source venv/bin/activate.fish
```

### Bash / Zsh

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

---

## Instalar dependencias

Con el entorno virtual activo:

```bash
pip install -r requirements.txt
```

---

# Configuración de PostgreSQL con Docker

El archivo `docker-compose.yml` se encuentra en la raíz del proyecto.

Regresar a la carpeta principal:

```bash
cd ..
```

Levantar el contenedor de PostgreSQL:

```bash
docker compose up -d
```

Verificar que el contenedor esté ejecutándose:

```bash
docker ps
```

Ejemplo:

```text
agencia-postgres-1   postgres   Running
```

Para detener el contenedor:

```bash
docker compose down
```

---

# Variables de entorno Backend

Dentro de la carpeta `backend` crear un archivo:

```text
.env
```

Ejemplo:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/database
SECRET_KEY=clave_secreta
```

---

# Ejecutar Backend

Entrar al backend:

```bash
cd backend
```

Activar el entorno virtual:

```bash
source venv/bin/activate.fish
```

Ejecutar FastAPI:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en:

```
http://localhost:8000
```

Documentación automática de la API:

```
http://localhost:8000/docs
```

---

# Configuración del Frontend

Abrir una nueva terminal.

Entrar a la carpeta frontend:

```bash
cd frontend
```

Instalar dependencias:

```bash
npm install
```

---

# Ejecutar Frontend

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

El frontend estará disponible en:

```
http://localhost:5173
```

---

# Flujo de trabajo Git

El proyecto utiliza ramas para organizar los cambios.

Estructura:

```text
main
│
└── dev
    │
    ├── feature-nombre
    │
    └── feature-compañero
```

---

# Crear una nueva rama

Cambiar a desarrollo:

```bash
git checkout dev
```

Crear rama:

```bash
git checkout -b nombre-rama
```

---

# Guardar cambios

Agregar archivos:

```bash
git add .
```

Crear commit:

```bash
git commit -m "Descripción del cambio"
```

Subir cambios:

```bash
git push origin nombre-rama
```

---

# Reglas del proyecto

- No subir archivos `.env`.
- No subir `node_modules`.
- No subir `venv`.
- Trabajar en ramas independientes.
- No realizar cambios directamente en `main`.
- Integrar cambios mediante Pull Request.

---

# Inicio rápido del proyecto

## Backend

```bash
cd agencia

cd backend

source venv/bin/activate.fish

cd ..

docker compose up -d

cd backend

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Frontend

En otra terminal:

```bash
cd agencia/frontend

npm install

npm run dev
```

---

# Equipo de desarrollo

Proyecto desarrollado utilizando Git y GitHub con un flujo de trabajo basado en ramas para permitir el desarrollo colaborativo.


