import { useLocation } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import {type Reponse} from "./Commande"

export function Traitement()
{
    const local = useLocation();
    const object = local.state.Response as Reponse;
    const id = object.id;
    const liste = object.liste;
    const valeur  = object.valeur;
    console.log("object",object);
    console.log("id",id);
    return (
        <div>
            <FrontOfficeHeader />
            <main>
                <div>id : {id}</div>
                <div>valeur : x {valeur}</div>
                <div>liste : {JSON.stringify(liste)}</div>
            </main>
        </div>
    )
}
export default Traitement;