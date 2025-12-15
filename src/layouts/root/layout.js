import template from "./template.html?raw";
import { htmlToDOM } from "@/lib/utils.js";



/**
 * Construit et retourne le layout principal de l'application.
 *
 * @function
 * @returns {DocumentFragment} Le fragment DOM représentant le layout complet.
 *
 * @description
 * - Crée un fragment DOM à partir du template HTML.
 * - Génère le DOM de l'en-tête via HeaderView.dom().
 * - Génère le DOM du pied de page via FooterView.dom().
 * - Remplace le slot nommé "header" par le DOM de l'en-tête.
 * - Remplace le slot nommé "footer" par le DOM du pied de page.
 * - Retourne le fragment DOM finalisé.
 */
export function RootLayout() {
    let layout = htmlToDOM(template);
    return layout;
}