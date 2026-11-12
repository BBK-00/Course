(() => {
  const host = document.getElementById('toolsPython');
  if (!host || !window.PyPractice) return;
  window.PyPractice.playground(host, 'for n in range(1, 5):\n    print(n, n ** 2)');
})();
