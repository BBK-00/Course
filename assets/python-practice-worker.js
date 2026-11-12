import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';

const harness = String.raw`
import builtins, contextlib, io, json, traceback

class CappedOutput(io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 6000:
            raise ValueError("Шығыс тым ұзын")
        return super().write(text)

def check_code(code, cases):
    try:
        program = compile(code, "<student>", "exec")
    except SyntaxError as error:
        return [dict(error=type(error).__name__, line=error.lineno, message=error.msg)] * len(cases)
    results = []
    for source in cases:
        stdin = io.StringIO(source + "\n" if source else "")
        output = CappedOutput()
        def read_input(prompt=""):
            line = stdin.readline()
            if not line:
                raise EOFError("Енгізу жолдары бітті")
            return line.rstrip("\n").rstrip("\r")
        scope = {"__name__": "__main__", "__builtins__": dict(vars(builtins), input=read_input)}
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()):
                exec(program, scope)
            results.append(dict(out=output.getvalue()))
        except BaseException as error:
            line = next((frame.lineno for frame in reversed(traceback.extract_tb(error.__traceback__)) if frame.filename == "<student>"), None)
            results.append(dict(error=type(error).__name__, line=line, message=str(error)[:180]))
    return results

_job = json.loads(_practice_job)
json.dumps(check_code(_job["code"], _job["inputs"]), ensure_ascii=False)
`;

const ready = loadPyodide();
self.onmessage = async ({ data }) => {
  try {
    const py = await ready;
    self.postMessage({ ready: true });
    py.globals.set('_practice_job', JSON.stringify(data));
    self.postMessage({ results: JSON.parse(py.runPython(harness)) });
  } catch {
    self.postMessage({ error: 'Python ортасы жүктелмеді. Байланысты тексеріп, қайта көр.' });
  }
};
