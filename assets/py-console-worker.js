/* Консоль үшін Python браузердің өзінде орындалады (Pyodide). Сервер мен ортақ онлайн қызметке бармайды, сондықтан нәтиже бірден шығады.
   Хабарлама: { id, code, inputs } → { id, out, err, need }. need: бағдарлама енгізу күтіп тұр (келесі input() үшін жол жетпеді). */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';

const harness = String.raw`
import builtins, contextlib, io, json, traceback

class NeedInput(BaseException):
    pass

class Capped(io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 8000:
            raise ValueError("Шығыс тым ұзын")
        return super().write(text)

def run(code, lines):
    out = Capped()
    try:
        program = compile(code, "main.py", "exec")
    except SyntaxError as error:
        where = (str(error.lineno) + "-жол, ") if error.lineno else ""
        return dict(out="", err="SyntaxError: " + where + str(error.msg))
    queue = list(lines)
    def read_input(prompt=""):
        out.write(str(prompt))
        if not queue:
            raise NeedInput()
        value = queue.pop(0)
        out.write(value + chr(10))
        return value
    scope = {"__name__": "__main__", "__builtins__": dict(vars(builtins), input=read_input)}
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            exec(program, scope)
        return dict(out=out.getvalue())
    except NeedInput:
        return dict(out=out.getvalue(), need=True)
    except BaseException as error:
        frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == "main.py"]
        head = ("Traceback (most recent call last):" + chr(10) + '  File "main.py", line ' + str(frames[-1].lineno) + chr(10)) if frames else ""
        return dict(out=out.getvalue(), err=head + type(error).__name__ + ": " + str(error)[:200])

_job = json.loads(_console_job)
json.dumps(run(_job["code"], _job["inputs"]), ensure_ascii=False)
`;

const ready = loadPyodide();
ready.then(() => self.postMessage({ ready: true }), () => self.postMessage({ failed: true }));
self.onmessage = async ({ data }) => {
  try {
    const py = await ready;
    self.postMessage({ id: data.id, started: true });
    py.globals.set('_console_job', JSON.stringify({ code: data.code, inputs: data.inputs }));
    self.postMessage({ id: data.id, ...JSON.parse(py.runPython(harness)) });
  } catch {
    self.postMessage({ id: data.id, failed: true });
  }
};
