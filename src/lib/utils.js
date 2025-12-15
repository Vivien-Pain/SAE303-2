/**
 * Renders a template string by replacing placeholders with corresponding data values.
 *
 * @param {string} template - The template string containing placeholders in the format {{key}}.
 * @param {Object} data - An object containing key-value pairs where the key corresponds to the placeholder in the template.
 * @returns {string} - The rendered HTML string with placeholders replaced by data values.
 */
let genericRenderer = function(template, data){
    let html = template;
    for(let key in data){
        html = html.replaceAll(new RegExp("{{"+key+"}}", "g"), data[key]);
    }
    return html;
}

/**
 * Converts an HTML string into a DocumentFragment.
 *
 * @param {string} htmlString - The HTML string to convert.
 * @returns {DocumentFragment} - A DocumentFragment containing the parsed HTML elements.
 */
function htmlToDOM(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    const fragment = template.content;
    if (fragment.childElementCount === 1) {
        return fragment.firstElementChild;
    }
    console.error("htmlToDOM: fragment must contain exactly one child element.");
    return null;
}

/** * Generates a random hexadecimal color string.
 *
 * @returns {string} - A random hexadecimal color in the format #RRGGBB.
 */
function randomHexaColor(){
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}


export { genericRenderer, htmlToDOM, randomHexaColor };