export const ideSetup = `
  <section class="pt-section pt-setup" id="setup" aria-labelledby="setup-title">
    <span class="pt-overline">БІРІНШІ БАҒДАРЛАМА</span>
    <h2 id="setup-title">Python-ды қай жерде жазамыз?</h2>
    <p>Кодты браузерде бірден сынауға болады. Компьютерде файлдармен жұмыс істеу үшін Python орнатып, VS Code немесе PyCharm таңда.</p>
    <div class="pt-setup-options">
      <details open>
        <summary><span>01</span> Браузерде бірден бастау</summary>
        <div>
          <ol>
            <li>Онлайн редакторды аш.</li>
            <li>Редакторға <code>print("Сәлем, Python!")</code> деп жаз.</li>
            <li><b>Run</b> батырмасын бас. Нәтижені <b>Output</b> аймағынан оқы.</li>
          </ol>
          <div class="pt-source-links">
            <a href="https://www.programiz.com/python-programming/online-compiler/" target="_blank" rel="noopener noreferrer">Programiz ↗</a>
            <a href="https://www.jdoodle.com/python3-programming-online" target="_blank" rel="noopener noreferrer">JDoodle ↗</a>
          </div>
        </div>
      </details>
      <details>
        <summary><span>02</span> Windows-қа Python орнату</summary>
        <div>
          <ol>
            <li>Ресми жүктеу бетінен Windows үшін <b>Python install manager</b> жүкте. Жүктелген файлды ашып, <b>Install</b> батырмасын бас.</li>
            <li>Жаңа PowerShell терезесін ашып, <code>python --version</code> деп тексер. Алғашқы іске қосқанда Python нұсқасын орнату сұралса, соны аяқта.</li>
            <li><code>hello.py</code> файлын жасап, оған <code>print("Сәлем, Python!")</code> жаз. Файл тұрған қалтада <code>python hello.py</code> командасын орында.</li>
          </ol>
          <div class="pt-source-links">
            <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer">Python жүктеу ↗</a>
            <a href="https://docs.python.org/3/using/windows.html" target="_blank" rel="noopener noreferrer">Windows нұсқаулығы ↗</a>
          </div>
        </div>
      </details>
      <details>
        <summary><span>03</span> VS Code арқылы іске қосу</summary>
        <div>
          <ol>
            <li>VS Code жүктеу бетінде Windows үшін <b>User Installer</b> таңда. Жүктелген <code>.exe</code> файлын ашып, орнатуды аяқта. VS Code ішіндегі <b>Extensions</b> бөлімінен Microsoft шығарған <b>Python</b> кеңейтімін орнат.</li>
            <li>Оқу қалтаңды ашып, <code>hello.py</code> файлын жаса. Windows-та <code>Ctrl+Shift+P</code> басып, <b>Python: Select Interpreter</b> арқылы орнатқан Python-ды таңда.</li>
            <li>Кодты сақта да, редактордың жоғарғы жағындағы <b>Run Python File</b> батырмасын бас. Нәтиже терминалда шығады.</li>
          </ol>
          <div class="pt-source-links">
            <a href="https://code.visualstudio.com/download" target="_blank" rel="noopener noreferrer">VS Code жүктеу ↗</a>
            <a href="https://marketplace.visualstudio.com/items?itemName=ms-python.python" target="_blank" rel="noopener noreferrer">Python кеңейтімі ↗</a>
            <a href="https://code.visualstudio.com/docs/python/python-tutorial" target="_blank" rel="noopener noreferrer">Ресми нұсқаулық ↗</a>
          </div>
        </div>
      </details>
      <details>
        <summary><span>04</span> PyCharm арқылы іске қосу</summary>
        <div>
          <ol>
            <li>JetBrains сайтынан жүйеңе сай PyCharm нұсқасын жүкте. Windows-та жүктелген <code>.exe</code> файлын ашып, орнату қадамдарын аяқта.</li>
            <li><b>New Project → Pure Python</b> таңдап, жоба қалтасын көрсет. Интерпретаторды таңда және <b>Create</b> батырмасын бас.</li>
            <li>Жобаға <code>hello.py</code> файлын қос. Кодты жазып, файлды оң жақ батырмамен бас та, <b>Run</b> пәрменін таңда. Нәтижені төменгі <b>Run</b> терезесінен көресің.</li>
          </ol>
          <div class="pt-source-links">
            <a href="https://www.jetbrains.com/pycharm/download/" target="_blank" rel="noopener noreferrer">PyCharm жүктеу ↗</a>
            <a href="https://www.jetbrains.com/help/pycharm/creating-and-running-your-first-python-project.html" target="_blank" rel="noopener noreferrer">Алғашқы жоба нұсқаулығы ↗</a>
          </div>
        </div>
      </details>
    </div>
  </section>`;
