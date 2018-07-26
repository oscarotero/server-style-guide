(function() {
    let query = document.location.href.split('?')[1],
        hash = document.location.hash.substr(1),
        domainValue;

    if (query) {
        query.split('&').forEach(value => {
            const result = value.match(/^domain=([\w-]+\.[\w]+)/);

            if (result) {
                domainValue = result[1];
            }
        });
    }

    //Replace the example.com by the custom domain
    if (domainValue) {
        document
            .querySelectorAll('#steps code')
            .forEach(
                element =>
                    (element.innerHTML = element.innerHTML
                        .replace(/example\.com/g, domainValue)
                        .replace(/example/g, domainValue.split('.')[0]))
            );
    }

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

    //Open/close the steps
    document.querySelectorAll('#steps h2').forEach(element => {
        element.addEventListener('click', event => {
            var section = event.currentTarget.parentNode.parentNode;
            section.classList.toggle('is-opened');
            history.replaceState(
                {},
                null,
                '#' +
                    (section.classList.contains('is-opened') ? section.id : '')
            );
        });
    });

    //Open/close the optional sub-steps
    document.querySelectorAll('#steps .is-optional > h3').forEach(element => {
        element.addEventListener('click', event => {
            event.currentTarget.parentNode.classList.toggle('is-opened');
        });
    });

    if (hash) {
        document.getElementById(hash).classList.toggle('is-opened');
    }
})();
