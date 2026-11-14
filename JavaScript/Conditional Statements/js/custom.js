
function votingEligible(){
    var number = prompt('Enter the number');

    if(number >= 18){
        console.log('Eligible for vote.')
    } else {
        console.log('Not Eligible for vote.')
    }
}

var positiveNumber = () => {
    var number = prompt('Enter the number');

    if(number >= 0){
        console.log('Positive Number.')
    } else if(number < 0){
        console.log('Negative Number.')
    } else {
        console.log('Invalid Value.')
    }
}

trafficeSignal = () => {
    var signal = prompt('Enter the signal name (eg - Red, Green, yellow)');

    // signal = signal.toUpperCase();
    // console.log(signal)
    signal = signal.toLowerCase();
    // console.log(signal)

    if(signal == 'red'){
        console.log('Red Signal')
    } else if(signal == 'yellow'){
        console.log('Yellow Signal')
    } else if(signal == 'green'){
        console.log('Green Signal')
    } else {
        console.log('Invalid Value')
    }
}

temperatureConverter = () => {
    from = prompt('Enter the value of from')
    to = prompt('Enter the value of to')
    number = prompt('Enter the number');

    if(from == 'c' && to == 'f'){
        formula = (number * 9/5) + 32;
        console.log(formula);
    }

}