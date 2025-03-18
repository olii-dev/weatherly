const LOCATIONIQ_API_KEY = "pk.8dee3ad385bf6bb40cc97f489f8711a0";

document.addEventListener("DOMContentLoaded", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getWeatherByCoords, (error) => {
            console.log("Geolocation denied. Allowing manual search.");
            alert("Unable to get your location. You can search for a city manually.");
            document.getElementById("searchContainer").style.display = "block";
        });
    } else {
        console.log("Geolocation not supported.");
        alert("Your browser does not support geolocation. Please use the manual search.");
        document.getElementById("searchContainer").style.display = "block";
    }
});

async function getWeatherByCoords(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;

    try {
        let geoResponse = await fetch(`https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`);
        if (!geoResponse.ok) throw new Error("Error fetching location name");

        let geoData = await geoResponse.json();
        let locationName = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || geoData.address.state || "Unknown Location";

        if (locationName === "Adelaide" && geoData.address.city_district) {
            locationName = geoData.address.city_district;
        }

        document.getElementById("weatherDisplay").innerHTML = "Loading Weather...";
        fetchWeather(lat, lon, locationName);
    } catch (error) {
        alert(error.message);
    }
}

async function fetchWeather(lat, lon, locationName) {
    try {
        let weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation_probability&timezone=auto`);
        if (!weatherResponse.ok) throw new Error("Error fetching weather data");

        let weatherData = await weatherResponse.json();
        let currentWeather = weatherData.current_weather;
        let hourlyForecast = weatherData.hourly;

        let now = new Date();
        let threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        let forecastTimes = hourlyForecast.time.filter(time => {
            let date = new Date(time);
            return date > now && date <= threeHoursLater;
        });

        let forecastHTML = forecastTimes.map((time, index) => {
            let timeIndex = hourlyForecast.time.indexOf(time);
            return `
                <div class="hourly-forecast">
                    <p>${new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Temp: ${hourlyForecast.temperature_2m[timeIndex]}°C</p>
                    <p>Rain: ${hourlyForecast.precipitation_probability[timeIndex]}%</p>
                </div>
            `;
        }).join('');

        document.getElementById("weatherDisplay").innerHTML = `
            <div class="current-weather">
                <h2>${locationName}</h2>
                <p>Current Temperature: ${currentWeather.temperature}°C</p>
                <p>Wind Speed: ${currentWeather.windspeed} km/h</p>
            </div>
            <h3>Hourly Forecast for the Next 3 Hours</h3>
            <div class="hourly-forecast-container">
                ${forecastHTML}
            </div>
        `;
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById("toggleSearch").addEventListener("click", () => {
    let searchContainer = document.getElementById("searchContainer");
    searchContainer.style.display = searchContainer.style.display === "none" ? "block" : "none";
});