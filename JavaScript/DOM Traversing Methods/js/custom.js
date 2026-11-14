
// var output = document.getElementById('row').parentNode;

// var output = document.getElementById('row').parentElement;

// var output = document.getElementById('row').childNodes;

// var output = document.getElementById('row').children;

// var output = document.getElementById('row').lastElementChild;

// var output = document.getElementById('row').previousElementSibling;

// var output = document.getElementById('row').nextElementSibling;


// console.log(output.innerText)

// var faqQuestions = document.querySelector('.faq-list').children;

var active = `<span
            class="faq-icon flex h-9 w-9 shrink-0 rotate-180 items-center justify-center rounded-full bg-indigo-600 text-white transition duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </span>`;

var inActive = `<span
            class="faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </span>`;


// var text = '<h1>'+ active +'</h1>';
//  var text = `<h1> ${ active } </h1>`;




var faqQuestions = document.querySelectorAll('.faq-item');

faqQuestions.forEach((v, i) => {
    v.addEventListener('click', () => {
        v.lastElementChild.classList.toggle('hidden');
        v.firstElementChild.lastElementChild.innerHTML = active;

        faqQuestions.forEach((element, index) => {
            if(i != index){
                element.lastElementChild.classList.add('hidden');
                element.firstElementChild.lastElementChild.innerHTML = inActive;
            }
        })        
    })
})



// console.log(faqQuestions)