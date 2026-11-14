
const getProducts = () => {
    try {
        
        fetch('https://dummyjson.com/products?limit=8')
        .then(async(result) => {
            result = await result.json();
            displayProducts(result.products, 1);
        })
        .catch(() => {
            document.getElementById('products').innerHTML = '<div>Something went wrong.</div>';
        })

    } catch (error) {
        console.log(error);
    }
}

const getAllProducts = () => {
    try {
        
        fetch('https://dummyjson.com/products?limit=28&skip=2')
        .then(async(result) => {
            result = await result.json();
            displayProducts(result.products, 2);
        })
        .catch(() => {
            document.getElementById('all-products').innerHTML = '<div>Something went wrong.</div>';
        })

    } catch (error) {
        console.log(error);
    }
}

const displayProducts = (products, type) => {
    var showProducts = '';

    products.forEach((v, i) => {
        showProducts += `<article class="product-card group">
                <div class="image-frame relative rounded-xl bg-gray-100">
                    <img class="product-image h-72 w-full object-cover sm:h-80" src="${ v.thumbnail }" alt="${ v.title }">
                    <span class="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold">${ v.category }</span>
                    <a href="#" aria-label="View the Sol ceramic vase" class="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow transition hover:accent-bg hover:text-white">+</a>
                </div>
                <div class="flex items-start justify-between pt-4">
                    <div><h3 class="font-semibold">${ v.title }</h3><p class="mt-1 text-sm text-gray-500">${ v.description }</p></div>
                    <p class="font-semibold">Rs.${ v.price }</p>
                </div>
                <div class="mt-3 flex items-center"><span class="text-sm tracking-widest text-yellow-600">★★★★★</span><span class="ml-2 text-xs text-gray-400">(38)</span></div>
            </article>`
    })

    if(type == 1){
        document.getElementById('products').innerHTML = showProducts;
    } else {
        document.getElementById('all-products').innerHTML = showProducts;
    }

}

getProducts();
getAllProducts()


const categoryProducts = (slug) => {
    try {
        
        fetch(`https://dummyjson.com/products/category/${slug}`)
        .then(async(result) => {
            result = await result.json();
            displayProducts(result.products, 2);
        })
        .catch(() => {
            document.getElementById('all-products').innerHTML = '<div>Something went wrong.</div>';
        })

    } catch (error) {
        console.log(error);
    }
}