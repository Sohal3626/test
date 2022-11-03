/*
new Promise(function(resolve, reject){
    setTimeout(function() {
      resolve(1);
    }, 2000);
  })
  .then(function(result) {
    console.log(result); // 1
    return result + 10;
  })
  .then(function(result) {
    console.log(result); // 11
    return result + 20;
  })
  .then(function(result) {
    console.log(result); // 31
  });
*/

function getData(cb) {
    return new Promise((resolve, reject) => {
        $.getJSON('/geojson/SIG.geojson', (response) => {
            if (response) resolve(response)
            else reject(new Error('Request failed'))
        })
    })
}

// getData()
//    .then((data) => console.log(data))
//    .catch((err) => console.log(err))

// -------------------

async function getData() {
  let data = await getJSON()
  console.log(data)
}

function getJSON() {
  return new Promise((resolve, reject) => {
    $.getJSON('/geojson/SIG.geojson', (response) => {
        if (response) resolve(response)
        else reject(new Error('Request failed'))
    })
  })
}

getData()