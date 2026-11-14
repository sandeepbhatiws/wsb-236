




// console.log(dateDifference)
// console.log(seconds)
// console.log(minutes)
// console.log('Hours - ',hours)
// console.log('Days - ',days)





const showDate = () => {

    var currentDate = new Date();
    var saleOfferDate = '2026-11-12 00:00:00';
    var saleOfferDate = new Date(saleOfferDate);

    var dateDifference = saleOfferDate - currentDate;

    var seconds = dateDifference/1000;
    var minutes = seconds/60;
    var hours = minutes/60;
    var days = hours/24;

    var dateDifference = Math.floor(dateDifference % 1000)
    var seconds = Math.floor(seconds % 60)
    var minutes = Math.floor(minutes % 60)
    var hours = Math.floor(hours % 24);
    var days  = Math.floor(days);

    document.querySelector('#days').innerHTML = days;
    document.querySelector('#hours').innerHTML = hours;
    document.querySelector('#minutes').innerHTML = minutes;
    document.querySelector('#seconds').innerHTML = seconds;
    document.querySelector('#milliseconds').innerHTML = dateDifference;
}
// console.log(currentDate)
// console.log(saleOfferDate)

// document.querySelector('#currentdate').innerHTML = currentDate;


// function getData() {
//     console.log('Alert')
// }

// setTimeout(() => {
//     console.log('Hello World')
// }, 5000)

showDate()

setInterval(() => {
    showDate()
}, 1000)
