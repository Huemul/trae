/* globals document trae */

((t) => {

  const result = document.getElementById('result');
  const loading = document.getElementById('loading-text');
  const url = 'https://jsonplaceholder.typicode.com/posts/1';

  let i = 0;
  const interval = setInterval(() => {
    // eslint-disable-next-line prefer-template
    loading.innerHTML = '// Loading ' + Array(i).fill('.').join('');
    // eslint-disable-next-line no-plusplus
    i = i++ < 3 ? i : 0;
  }, 200);

  function success(res) {
    console.log(res.data);
    // eslint-disable-next-line prefer-template
    res.data.title = res.data.title.slice(0, 8);
    // eslint-disable-next-line prefer-template
    res.data.body = res.data.body.slice(0, 20) + '...';
    return Promise.resolve(res);
  }

  trae.after(success);

  trae.get(url)
  .then((res) => {
    clearInterval(interval);
    console.log(res);
    result.removeChild(loading);

    let html = '\n// request final reponse\n';
    html += JSON.stringify(res, null, '\t');
    result.innerHTML += html;
  });

})(trae);
