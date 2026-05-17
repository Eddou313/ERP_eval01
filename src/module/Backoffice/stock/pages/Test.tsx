import { recordStockMovement } from "../api/stockMovementService";

export function Test()
{
    async function save()
    {
        try{
            await recordStockMovement(
                1,10,0,"adjustment",1
            );
        }
        catch(e:any)
        {
            console.error(`erreur lors de la creation de mouvement : ${e.message}`)
        }
    }
    return (
        <div>
            <button onClick={save}>Save mouvement</button>
        </div>
    )
}
export default Test;