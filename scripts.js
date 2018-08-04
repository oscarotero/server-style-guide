(function() {
    replaceValues(document.location.search.substr(1).replace('domain=', ''));

    //Validate the domain before send the form
    document.getElementById('domain').addEventListener('keyup', event => {
        if (event.currentTarget.validity.patternMismatch) {
            event.currentTarget.setCustomValidity(
                'This value is incorrect. Must be [name].[domain]'
            );
        } else {
            event.currentTarget.setCustomValidity('');
        }
    });

    function replaceValues(value) {
        const result = getUserAndDomain(value);

        if (!result) {
            return;
        }

        document.getElementById('domain').value = value;

        document
            .querySelectorAll('.step code')
            .forEach(
                element =>
                    (element.innerHTML = element.innerHTML
                        .replace(/myuser/g, result[0])
                        .replace(/mydomain\.com/g, result[1])
            ));
    }

    function getUserAndDomain(domain) {
        const matches = domain.match(/(([\w-]+)\.)?(([\w-]+)\.[\w]+)/);

        if (!matches) {
            return;
        }

        if (matches[2]) {
            return [matches[2], matches[0]];
        }

        return [matches[4], matches[0]];
    }
})();
