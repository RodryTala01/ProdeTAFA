const vue = new Vue({
    el: '#app',
    data: {
        listaDatos: []
    },
    created() {
        this.getLista();
        // Ejecutar recargar() cada segundo
        setInterval(this.recargar, 60000);
    },
    methods: {
        recargar() {
            console.log("Recargando...");
            this.getLista();
        },
        getLista() {
            // id de la hoja de calculo
            idSheets = '169rYxgQwzjatwq4iFgCTPn8y83IdvRH-Guy2PmTtnRk';
            //// nuestra      APIKey
            apiKey = 'AIzaSyDS9VtkbPnvgTil44LtEiQ--DLIp5-GE2g';
            // rango de la hoja de calculo que queremos leer
            values = 'A2:AE12';
            // fetch es un método nativo para hacer peticiones http
            // en el navegador 
            fetch("https://content-sheets.googleapis.com/v4/spreadsheets/" + idSheets + "/values/A2:AZ100?access_token=" + apiKey + "&key=" + apiKey)
                .then((lista) => {
                    return lista.json()
                }).then((valores) => {
                    this.listaDatos = valores.values
                }).catch(err => {
                    console.log(err);
                })
        } // fin funcion getLista()
    } // fin methods
}) // fin instancia

setInterval(recargar, 100);