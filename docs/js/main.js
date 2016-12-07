/* globals document trae */

((t) => {

  const result = document.getElementById('result');
  const loading = document.getElementById('loading-text');
  const url = 'https://jsonplaceholder.typicode.com/posts/1';

  let i = 0;
  const interval = setInterval(() => {
    // eslint-disable-next-line prefer-template
    loading.innerHTML = '// Loading ' + Array(i).fill('.').join('');
    i = i++ < 3 ? i : 0;
  }, 200);

  function success(res) {
    res.data = null;
    return Promise.resolve(res);
  }

  trae.use({ success });

  trae.get(url)
  .then((res) => {
    clearInterval(interval);
    result.removeChild(loading);

    let html = '\n// request final reponse\n';
    html += JSON.stringify(res, null, '\t');
    result.innerHTML += html;
  });

})(trae);
