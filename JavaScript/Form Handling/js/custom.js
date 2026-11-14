
const countries = [
    { id: 1, name: "India" },
    { id: 2, name: "United States" },
    { id: 3, name: "Canada" },
    { id: 4, name: "Australia" },
    { id: 5, name: "Brazil" },
    { id: 6, name: "Germany" },
    { id: 7, name: "Mexico" },
    { id: 8, name: "Nigeria" },
    { id: 9, name: "Pakistan" },
    { id: 10, name: "Malaysia" }
];

const states = [
    { id: 1, name: "Rajasthan", country_id: 1 },
    { id: 2, name: "Maharashtra", country_id: 1 },
    { id: 3, name: "Gujarat", country_id: 1 },
    { id: 4, name: "Uttar Pradesh", country_id: 1 },
    { id: 5, name: "Kerala", country_id: 1 },
    { id: 6, name: "California", country_id: 2 },
    { id: 7, name: "Texas", country_id: 2 },
    { id: 8, name: "Florida", country_id: 2 },
    { id: 9, name: "New York", country_id: 2 },
    { id: 10, name: "Ohio", country_id: 2 },
    { id: 11, name: "Ontario", country_id: 3 },
    { id: 12, name: "Quebec", country_id: 3 },
    { id: 13, name: "British Columbia", country_id: 3 },
    { id: 14, name: "Alberta", country_id: 3 },
    { id: 15, name: "Manitoba", country_id: 3 },
    { id: 16, name: "New South Wales", country_id: 4 },
    { id: 17, name: "Victoria", country_id: 4 },
    { id: 18, name: "Queensland", country_id: 4 },
    { id: 19, name: "Tasmania", country_id: 4 },
    { id: 20, name: "South Australia", country_id: 4 },
    { id: 21, name: "São Paulo", country_id: 5 },
    { id: 22, name: "Rio de Janeiro", country_id: 5 },
    { id: 23, name: "Minas Gerais", country_id: 5 },
    { id: 24, name: "Bahia", country_id: 5 },
    { id: 25, name: "Paraná", country_id: 5 },
    { id: 26, name: "Bavaria", country_id: 6 },
    { id: 27, name: "Berlin", country_id: 6 },
    { id: 28, name: "Hamburg", country_id: 6 },
    { id: 29, name: "Hesse", country_id: 6 },
    { id: 30, name: "Saxony", country_id: 6 },
    { id: 31, name: "Jalisco", country_id: 7 },
    { id: 32, name: "Yucatán", country_id: 7 },
    { id: 33, name: "Chihuahua", country_id: 7 },
    { id: 34, name: "Puebla", country_id: 7 },
    { id: 35, name: "Oaxaca", country_id: 7 },
    { id: 36, name: "Lagos", country_id: 8 },
    { id: 37, name: "Kano", country_id: 8 },
    { id: 38, name: "Rivers", country_id: 8 },
    { id: 39, name: "Oyo", country_id: 8 },
    { id: 40, name: "Kaduna", country_id: 8 },
    { id: 41, name: "Punjab", country_id: 9 },
    { id: 42, name: "Sindh", country_id: 9 },
    { id: 43, name: "Khyber Pakhtunkhwa", country_id: 9 },
    { id: 44, name: "Balochistan", country_id: 9 },
    { id: 45, name: "Gilgit-Baltistan", country_id: 9 },
    { id: 46, name: "Johor", country_id: 10 },
    { id: 47, name: "Kedah", country_id: 10 },
    { id: 48, name: "Kelantan", country_id: 10 },
    { id: 49, name: "Pahang", country_id: 10 },
    { id: 50, name: "Selangor", country_id: 10 }
];

var getUserData = localStorage.getItem('userInfo')
var getUserData = JSON.parse(getUserData)

var userData = getUserData ? getUserData : [];


var getCountryData = () => {

    var countryOptions = '<option>Select Country</option>';

    countries.forEach((v,i) => {
        countryOptions += `<option value='${ v.id }'>${ v.name }</option>`;
    })

    document.getElementById('country').innerHTML = countryOptions;
}

getCountryData();


var getStateData = (filterStates) => {

    var stateOptions = '<option>Select State</option>';

    filterStates.forEach((v,i) => {
        stateOptions += `<option value='${ v.id }'>${ v.name }</option>`;
    })

    document.getElementById('state').innerHTML = stateOptions;
}


document.getElementById('country').addEventListener('change', (event) => {
    
    var getStates = states.filter((v) => {
        if(v.country_id == event.target.value){
            return v;
        }
    })

    getStateData(getStates);
})

document.getElementById('form-handler').addEventListener('submit', (event) => {
    event.preventDefault();

    const data = {
        name : event.target.name.value,
        email : event.target.email.value,
        mobile_number : event.target.mobile_number.value,
        country_id : event.target.country.value,
        state_id : event.target.state.value,
        message : event.target.message.value
    }

    userData = [data, ...userData];

    var finalData = JSON.stringify(userData);
    localStorage.setItem('userInfo', finalData)

    displayData()

    event.target.reset();


})

const displayData = () => {

    var data = '';

    userData.forEach((v, i) => {

        var getCountryName = countries.filter((country) => {
            if(v.country_id == country.id){
                return country
            }
        })

        var getStateName = states.filter((state) => {
            if(v.state_id == state.id){
                return state
            }
        })

        data += `<tr class="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700"><th scope="row" class="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">${ i+1 }</th>
                <td class="px-6 py-4">${ v.name }</td>
                <td class="px-6 py-4">${ v.email }</td>
                <td class="px-6 py-4">${ v.mobile_number }</td>
                <td class="px-6 py-4">${ getCountryName[0]?.name }</td>
                <td class="px-6 py-4">${ getStateName[0]?.name }</td>
                <td class="px-6 py-4">${ v.message }</td>
                <td class="px-6 py-4">
                    <a onclick="deleteUser(${ i })"
                        class="font-medium text-blue-600 hover:underline dark:text-blue-500">Delete</a>
                </td>
            </tr>`;
    })   

    document.getElementById('displayData').innerHTML = data;
}

displayData()

const deleteUser = (index) => {
    if(confirm('Are you sure you want to delete ?')){
        userData = userData.filter((v, i) => {
            if(index != i){
                return v
            }
        })

        localStorage.setItem('userInfo', JSON.stringify(userData))

        displayData()
    }
}