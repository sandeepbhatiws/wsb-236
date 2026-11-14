



// new Promise((accept, reject) => {
//     const getData = fetch('https://dummyjson.com/products');
//     accept(getData)
//     // reject(getData)
// })
// .then((result) => {
//     new Promise((complete) => {
//         complete(result.json());
//     })
//     .then((finalResult) => {
//         console.log(finalResult)
//     })
// })
// .catch(() => {
//     console.log('Promise Incomplete')
// })

// const getProducts = () => {
//     fetch('https://dummyjson.com/products')
//     .then(res => res.json())
//     .then(console.log);
// }


const getProducts = async() => {
    try {
        var output = await fetch('https://dummyjson.com/products');
        var output = await output.json()
        
        console.log(output);
    } catch (error) {
        
    }
    
}



getProducts();

