  #!/usr/bin/env bash
  # Fish Audio Local — inicia todo con un solo comando: ./start.sh
  set -e
  cd "$(dirname "$0")"

  PORT="${PORT:-5050}"

  echo "== Fish Audio Local =="

  # --- localizar python3 -------------------------------------------------
  PYTHON_BIN=""
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON_BIN="$candidate"
      break
    fi
  done

  if [ -z "$PYTHON_BIN" ]; then
    echo "No encontré Python 3 instalado."
    echo "Instálalo desde https://www.python.org/downloads/ y vuelve a correr este script."
    exit 1
  fi

  # --- crear entorno virtual si no existe (o si quedó a medias) ----------
  venv_is_usable() {
    [ -f "venv/bin/activate" ] || [ -f "venv/Scripts/activate" ]
  }

  if [ -d "venv" ] && ! venv_is_usable; then
    echo "El entorno virtual anterior quedó incompleto, lo vuelvo a crear..."
    rm -rf venv
  fi

  if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    set +e
    "$PYTHON_BIN" -m venv venv
    VENV_STATUS=$?
    set -e

    if [ $VENV_STATUS -ne 0 ] || ! venv_is_usable; then
      rm -rf venv
      echo ""
      echo "Al Python de este sistema le falta el módulo 'venv' (típico en WSL/Ubuntu)."
      if command -v apt-get >/dev/null 2>&1; then
        echo "Intentando instalarlo con apt (te va a pedir tu contraseña de sudo)..."
        PYVER="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")')"
        sudo apt-get update -y || true
        sudo apt-get install -y "python${PYVER}-venv" python3-venv || true
        "$PYTHON_BIN" -m venv venv || true
      fi
      if ! venv_is_usable; then
        echo ""
        echo "Sigue sin poder crear el entorno virtual. Corre esto manualmente en tu"
        echo "terminal de WSL/Linux y vuelve a ejecutar ./start.sh:"
        echo ""
        echo "    sudo apt update && sudo apt install python3-venv"
        echo ""
        exit 1
      fi
    fi
  fi

  if [ -f "venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    . venv/bin/activate
  elif [ -f "venv/Scripts/activate" ]; then
    # shellcheck disable=SC1091
    . venv/Scripts/activate
  else
    echo "El entorno virtual está corrupto. Bórralo con 'rm -rf venv' y vuelve a correr ./start.sh"
    exit 1
  fi

  echo "Instalando dependencias (solo la primera vez tarda un poco)..."
  pip install -q --upgrade pip
  pip install -q -r requirements.txt

  # --- abrir el navegador automáticamente ---------------------------------
  (
    sleep 2
    URL="http://127.0.0.1:${PORT}"
    if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
    elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1
    elif command -v cmd.exe >/dev/null 2>&1; then cmd.exe /c start "$URL" >/dev/null 2>&1
    else echo "Abre manualmente en tu navegador: $URL"
    fi
  ) &

  echo ""
  echo "Arrancando el servidor local..."
  PORT="$PORT" "$PYTHON_BIN" app.py
