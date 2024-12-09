document.getElementById("subnetForm").addEventListener("submit", function(event) {
    event.preventDefault();

    // Récupérer les valeurs du formulaire
    const ipAddress = document.getElementById("ipAddress").value;
    const subnetMaskDecimal = document.getElementById("subnetMaskDecimal").value;
    const subnetMaskCIDR = document.getElementById("subnetMaskCIDR").value;

    // Fonction pour convertir une adresse IP (ou un masque) en decimal vers du binaire
    function ipAddressToBinary(ipAddress) {
        // Expression régulière pour valider une adresse IP au format décimal
        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    
        // Vérifier si la chaîne correspond au format décimal d'une adresse IP
        const match = ipAddress.match(ipRegex);
    
        if (match) {
            // Séparer les parties de l'adresse IP
            const octet1 = parseInt(match[1]);
            const octet2 = parseInt(match[2]);
            const octet3 = parseInt(match[3]);
            const octet4 = parseInt(match[4]);
    
            // Vérifier que chaque octet est compris entre 0 et 255
            if (octet1 >= 0 && octet1 <= 255 &&
                octet2 >= 0 && octet2 <= 255 &&
                octet3 >= 0 && octet3 <= 255 &&
                octet4 >= 0 && octet4 <= 255) {
                // L'adresse IP est valide, renvoyer l'adresse IP en binaire
                const binaryIp = [octet1, octet2, octet3, octet4].map(part => part.toString(2).padStart(8, '0')).join('.');
                return binaryIp;
            }
        }
    
        // Si l'adresse IP n'est pas valide, renvoyer null
        return null;
    }

    // Fonction pour convertir un masque CIDR en decimal
    function cidrToDecimal(cidr) {
        const binaryMask = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
        const binaryArray = binaryMask.match(/.{8}/g).map(part => parseInt(part, 2));
        return binaryArray.join('.');
    }

    // Fonction pour calculer l'adresse du réseau en binaire
    function calculateNetworkAddress(ipBinary, maskBinary) {       
        const networkBinary = ipBinary.map((part, index) => part & maskBinary[index]).join('.');
        return networkBinary;
    }

    function calculateNetworkAddress(binaryIp, binaryMask) {
        // Séparer les octets de l'adresse IP binaire
        const ipOctets = binaryIp.split('.');
        const maskOctets = binaryMask.split('.');
        
        // Initialiser un tableau pour stocker les octets de l'adresse du réseau en décimal
        const networkOctets = [];
    
        // Parcourir les octets de l'adresse IP et du masque et calculer l'adresse du réseau
        for (let i = 0; i < 4; i++) {
            const ipOctet = parseInt(ipOctets[i], 2);
            const maskOctet = parseInt(maskOctets[i], 2);
            // Calculer l'octet de l'adresse du réseau en décimal en appliquant le masque
            const networkOctet = ipOctet & maskOctet;
            networkOctets.push(networkOctet);
        }
    
        // Rejoindre les octets de l'adresse du réseau en une seule chaîne
        const networkAddress = networkOctets.join('.');
        
        return networkAddress;
    }

    function calculateNumberOfHosts(binaryIp, binaryMask) {
        // Séparer les octets de l'adresse IP et du masque binaire
        const ipOctets = binaryIp.split('.');
        const maskOctets = binaryMask.split('.');

        // Calculer le nombre de bits alloués pour le réseau (en comptant les bits du masque)
        const bitsAllocated = maskOctets.join('').split('0').join('').length;

        // Calculer le nombre de hôtes disponibles
        const numberOfHosts = Math.pow(2, 32 - bitsAllocated) - 2; // Soustraire 2 pour l'adresse réseau et de diffusion

        return numberOfHosts;
    }


    /**
     * La première adresse utilisable est l'adresse réseau incrémentée de 1.
     * La dernière adresse utilisable est l'adresse de diffusion diminuée de 1.
     * L'adresse de diffusion est calculée en appliquant un OU exclusif (XOR) entre l'adresse réseau et un masque inversé (complément à 1 du masque).
     *
     * @param binaryIp
     * @param binaryMask
     * @returns {{broadcast: *, firstUsable: string, lastUsable: string}|null}
     */
    function calculateAddresses(binaryIp, binaryMask) {
        // Séparer les octets de l'adresse IP en binaire et du masque de sous-réseau en binaire
        const ipOctets = binaryIp.split('.');
        const maskOctets = binaryMask.split('.');

        // Calculer l'adresse réseau en appliquant le masque
        const networkOctets = ipOctets.map((ipOctet, index) => parseInt(ipOctet, 2) & parseInt(maskOctets[index], 2));

        // Calculer l'adresse de diffusion en appliquant un XOR avec le complément à 1 du masque
        const invertedMaskOctets = maskOctets.map(maskOctet => ~parseInt(maskOctet, 2) & 0xFF); // 0xFF pour s'assurer que le résultat est sur 8 bits
        const broadcastOctets = networkOctets.map((networkOctet, index) => networkOctet | invertedMaskOctets[index]);

        // Calculer la première adresse utilisable en incrémentant l'adresse réseau
        const firstUsableOctets = [...networkOctets];
        if (firstUsableOctets[3] < 255) {
            firstUsableOctets[3] += 1;
        } else {
            // Si le dernier octet est 255, il n'y a pas de première adresse utilisable
            return null;
        }

        // Calculer la dernière adresse utilisable en décrémentant l'adresse de diffusion
        const lastUsableOctets = [...broadcastOctets];
        if (lastUsableOctets[3] > 0) {
            lastUsableOctets[3] -= 1;
        } else {
            // Si le dernier octet est 0, il n'y a pas de dernière adresse utilisable
            return null;
        }

        return {
            firstUsable: firstUsableOctets.map(octet => octet.toString(10)).join('.'),
            lastUsable: lastUsableOctets.map(octet => octet.toString(10)).join('.'),
            broadcast: broadcastOctets.map(octet => octet.toString(10)).join('.')
        };
    }


    // ****************************************************************************

    // Effectuer les calculs et afficher les résultats
    const ipAddressBinary = ipAddressToBinary(ipAddress);
    const subnetDecimal = (subnetMaskDecimal != '') ? subnetMaskDecimal : cidrToDecimal(parseInt(subnetMaskCIDR.split('/')[1]));

    const subnetMaskBinary = ipAddressToBinary(subnetDecimal);

    const networkAddress = calculateNetworkAddress(ipAddressBinary, subnetMaskBinary);

    const numberOfHosts = calculateNumberOfHosts(ipAddressBinary, subnetMaskBinary);

    const addresses = calculateAddresses(ipAddressBinary, subnetMaskBinary);

    document.getElementById("result").innerHTML = `
        <b>Adresse IP décimal :</b> ${ipAddress}<br>
        <b>Adresse IP binaire : ${ipAddressBinary}<br>
        <br>
        <b>Masque de sous-réseau décimal :</b> ${subnetDecimal}<br>
        <b>Masque de sous-réseau binaire :</b> ${subnetMaskBinary}<br>
        
        <br>
        <b>Adresse du réseau :</b> ${networkAddress}<br>
        
        <br>
        <b>Nombre d'hôtes possibles :</b> ${numberOfHosts}<br>
        
        <br>
        <b>Adresse de diffusion :</b> ${addresses.broadcast}<br>
        <br>
        <b>Première adresse utilisable :</b> ${addresses.firstUsable}<br>   
        <br>
        <b>Dernière adresse utilisable :</b> ${addresses.lastUsable}<br>      
    `;
});
