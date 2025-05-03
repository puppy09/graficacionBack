const postProyectoCreado = async(req, res)=>{
    try {
        
        const {proyecto, secuencias,clases, cu, paquetes,componentes} = req.body;
        const nuevoProyecto = await ProyectosCreados.create({id_proyecto:proyecto, dia_secuencias:secuencias, dia_componentes:componentes,dia_cu: cu,dia_paquetes:paquetes,dia_clases:clases});
        return res.status(200).json(nuevoProyecto);
    } catch (error) {
        
    }
}


module.exports = {postProyectoCreado}