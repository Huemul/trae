/* globals document trae */

((t) => {

  const result = document.getElementById('result');
  const url = 'https://jsonplaceholder.typicode.com/posts/1';

  function success(res) {
    res.data = null;
    res = JSON.stringify(res);
    return Promise.resolve(res);
  }

  function after(err, res) {
    res = res.split(',');
    return Promise.resolve(res);
  }

  trae.use({ success, after });

  trae.get(url)
  .then((res) => {
    let html = '\n\t\t\t// request final reponse\n\t\t\t';
    html += res.join('<br>\t\t\t');
    result.innerHTML += html;
  });

})(trae);
