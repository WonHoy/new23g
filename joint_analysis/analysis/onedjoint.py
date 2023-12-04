"""
Test for one dimensional joint analyzer  backend part
"""
from joint_analysis.analysis.jointdata import *
from joint_analysis.analysis.stiffness import *

# from stiffness import *
# from jointdata import *

import numpy as np
from operator import attrgetter, itemgetter

# TODO: !MAJOR! current logic works with constraints == 0 only.
# TODO: !MAJOR! current logic works with fastener going through all plates at each node. (see stiffness module also)
# ^^^^ Probably: add 'fastened_plates' = [1, 3, 4] to nodes
# ^^^^ Probably: (a-d) flexibility for (a-c-d) is just (a-c)(c-d)
# TODO: check all the commented lines and clean them up if necessary
# TODO: add doc strings to each method
# TODO: think about how to deal with DB. For now the DB dicts are created as global variables.


class Joint:
    """
    Class containing 1D-JOINT model with all the properties
    """

    def __init__(self, joint_info: dict, materials_db: dict, fasteners_db: dict):
        """
        Class initializer requiring the following inputs in order to create correct model:

        !important!
        Term 'node' within this class means horizontal coordinate reference and not the actual node that is described
        as vertical/horizontal intersection.
        Term 'plate' relates to 'plate_id' only. It does not relate to vertical coordinate.

        :param joint_info: dict containing information regarding nodes, plates, boundary conditions and loads.
        :param materials_db: dict containing information regarding material properties.
        :param fasteners_db: dict containing information regarding fastener properties.
        """

        joint_data = JointInputData(joint_info)
        self.nodes = joint_data.nodes
        self.nodes_ids = joint_data.nodes_ids
        self.nodes_qty = joint_data.nodes_qty
        self.plates_ids = joint_data.plates_ids
        self.plates_qty = joint_data.plates_qty
        self.boundary_conditions = joint_data.boundary_conditions
        self.loads = joint_data.loads
        # self.materials_db = materials_db
        # self.fasteners_db = fasteners_db
        self.method = joint_data.method
        self.fastener_models = {}
        for node in self.nodes:
            if node.fastener_id != '':
                connected_plates = node.plate_ids  # For now it's assumed that all plates in the stack are connected by fastener
                fastener_model = FastenerModel(node, connected_plates, self.method)
                # fastener_model = FastenerModel(node, connected_plates, materials_db, fasteners_db, DOUGLAS_METHOD)
                # fastener_model = FastenerModel(node, connected_plates, materials_db, fasteners_db, AIRBUS_METHOD)
            else:
                fastener_model = None
            self.fastener_models[node.id] = fastener_model

        # self.fastener_elements = {}
        self.plate_elements = {}
        self.reactions = []

        print('plates_ids', self.plates_ids)
        print('nodes_ids', self.nodes_ids)

        # Calculated attributes. Obtained by class methods.
        self.stiffness_matrix = self.define_stiffness_matrix()
        self.load_vector = self.define_load_vector()
        (disp_react_vector, displacements_dict, reactions_dict) = self.define_displacement_vector()
        self.displacement_vector = disp_react_vector
        self.displacements_dict = displacements_dict
        self.reactions_dict = reactions_dict

        # Saving files for debug
        path_debug_file = '.\\joint_analysis\\analysis\\debug_files\\'
        try:
            save_csv(path_debug_file + 'stiffness_matrix.csv', self.stiffness_matrix)

            f = open(path_debug_file + 'displacement_vector.txt', 'w')
            f.write(str(self.displacement_vector))
            f.close()
            matrix_print(self.displacement_vector, 'displacement vector')

            f = open(path_debug_file + 'load_vector.txt', 'w')
            f.write(str(self.load_vector))
            f.close()
        except FileNotFoundError:
            pass

        self.reactions = self.get_reactions()
        print('reactions: ', self.reactions)
        self.set_elements_displacements()

        # plate_elm_ids = sorted(list(self.plate_elements), key=itemgetter(0,1))
        # print(plate_elm_ids)
        # for elm_id in plate_elm_ids:
        #     elm = self.plate_elements[elm_id]
        #     print(elm)
        #
        # fastener_elm_ids = sorted(list(self.fastener_elements), key=itemgetter(0,1))
        # print(fastener_elm_ids)
        # for elm_id in fastener_elm_ids:
        #     elm = self.fastener_elements[elm_id]
        #     print(elm)
        self.connections = ConnectedElements(self.fastener_models, self.plate_elements, self.nodes_ids, self.plates_ids)
        # summary = self.connections.get_loads_summary()
        loads_and_stresses = self.connections.get_summary_dicts()
        print('**************************get_loads_summary()******************************')
        print(f'results len = {len(loads_and_stresses)}')
        print('loads and stresses:')
        for item in loads_and_stresses:
            print('\n', item)


    def define_displacement_vector(self) -> np.ndarray:
        """
        Method calculates displacement vector basing on stiffness matrix and load vector.

        :return: displacement vector
        """
        disp_react_vector = np.linalg.inv(self.stiffness_matrix).dot(self.load_vector)
        displacements_dict = {}
        reactions_dict = {}
        for plate_index in range(self.plates_qty):
            for node_index in range(self.nodes_qty):
                disp_index = plate_index * self.nodes_qty + node_index
                node_id = self.nodes_ids[node_index]
                plate_id = self.plates_ids[plate_index]
                if self.boundary_conditions.check_constrained(node_id, plate_id):
                    reaction =  disp_react_vector[disp_index]
                    reactions_dict[(node_id, plate_id)] = reaction
                    displacements_dict[(node_id, plate_id)] = 0.0
                else:
                    displacement = disp_react_vector[disp_index]
                    displacements_dict[(node_id, plate_id)] = displacement

        return (disp_react_vector, displacements_dict, reactions_dict)

    def define_load_vector(self) -> list:
        """
        Method creates load vector basing on input load data.

        :return: load vector.
        """
        load_vector = [0 for _ in range(self.plates_qty * self.nodes_qty)]
        for load in self.loads:
            node_index = self.nodes_ids.index(load.node_id)
            plate_index = self.plates_ids.index(load.plate_id)
            index = self.nodes_qty * plate_index + node_index
            load_vector[index] = -load.load_value
        return load_vector

    def define_stiffness_matrix(self) -> np.ndarray:
        """
        Method defines model stiffness matrix.
        1) It creates blocks of matrices <nodes_qty * nodes_qty>
        2) Quantity of block equals <plates_qty ** 2>
        3) Blocks on main diagonal -> matrices with fastener+plates combined stiffness
        4) Other blocks -> matrices with interplate stiffness
        5) Boundary conditions are already taken into account and, therefore, matrix can be unsymmetrical

        :return: model stiffness matrix
        """
        stiffness_matrix_blocks = [
            [np.zeros((self.nodes_qty, self.nodes_qty)) for _ in range(self.plates_qty)] for _ in range(self.plates_qty)
        ]
        for i in range(self.plates_qty):
            for j in range(self.plates_qty):
                if i == j:
                    plate_id = self.plates_ids[i]
                    stiffness_matrix_blocks[i][j] = self.define_plate_and_fastener_combined_stiffness_matrix(plate_id)
                elif i < j:
                    plate1_id = self.plates_ids[i]
                    plate2_id = self.plates_ids[j]
                    stiffness_matrix_blocks[i][j] = self.define_interplate_fastener_stiffness_matrix(plate1_id, plate2_id)
                else:
                    stiffness_matrix_blocks[i][j] = stiffness_matrix_blocks[j][i]
        stiffness_matrix = np.vstack([np.hstack(block_row) for block_row in stiffness_matrix_blocks])
        matrix_print(stiffness_matrix, 'stiffness_matrix')
        return stiffness_matrix

    # def define_interplate_fastener_flexibility(self, node: Node, plate1_id: int, plate2_id: int) -> float:
    #     d = self.fasteners_db[node.fastener_id]['D']
    #     Ef = self.fasteners_db[node.fastener_id]['Ebb']
    #     t1 = node.plate(plate1_id).thickness
    #     t2 = node.plate(plate2_id).thickness
    #     E1 = self.materials_db[node.plate(plate1_id).material_id]['E']
    #     E2 = self.materials_db[node.plate(plate2_id).material_id]['E']
    #     flexibility = Stiffness.swift_douglas_flexibility(d, Ef, t1, E1, t2, E2)
    #     return flexibility

    def define_interplate_fastener_stiffness_matrix(self, plate1_id: int, plate2_id: int) -> np.ndarray:
        fastener_stiffness_array = []
        print('******START******: define_interplate_fastener_stiffness_matrix')
        print('plates: ', plate1_id, plate2_id)
        for node in self.nodes:
            if not node.check_fastend(plate1_id, plate2_id):
                fastener_stiffness_array.append(0)
            else:
                # flexibilities = []
                # plates_pairs = node.adjacent_plates_pairs_between(plate1_id, plate2_id)
                # for item in plates_pairs:
                #     flexibilities.append(self.define_interplate_fastener_flexibility(node, *item))
                # print(flexibilities)
                # stiffness = Stiffness.interplate_stiffness(flexibilities)
                stiffness2 = self.fastener_models[node.id].get_fastener_element(plate1_id, plate2_id).stiffness
                # print('Fastener stiffness comparison:', stiffness, stiffness2, stiffness == stiffness2)
                # elm_id = (node.id, plate1_id, plate2_id)
                # fastener_elm = FastenerElement(elm_id, stiffness2)
                # self.fastener_elements[fastener_elm.id] = fastener_elm
                fastener_stiffness_array.append(stiffness2)
        matrix = np.diag(fastener_stiffness_array)
        matrix_print(matrix, 'fastener_stiffness_matrix')
        return matrix

    def define_plate_and_fastener_combined_stiffness_matrix(self, plate_id: int) -> np.ndarray:
        plates_stiffness_array = []
        print('define_plate_and_fastener_combined_stiffness_matrix ****************** plate = ', plate_id)

        for i, node in enumerate(self.nodes[:-1]):
            next_node = self.nodes[i + 1]
            if not (plate_id in node.plate_ids and plate_id in next_node.plate_ids):
                plates_stiffness_array.append(0)
            else:
                # E = self.materials_db[node.plate(plate_id).material_id]['E']
                E = node.plate(plate_id).E
                W = node.plate(plate_id).width
                t1 = node.plate(plate_id).thickness
                t2 = next_node.plate(plate_id).thickness
                coord1_x = node.coord_x
                coord2_x = next_node.coord_x
                coord_y = node.plate(plate_id).coord_y
                plate_elm = PlateElement(plate_id, node.id, next_node.id, E, W, t1, t2, coord1_x, coord2_x, coord_y)
                stiffness = plate_elm.stiffness
                self.plate_elements[plate_elm.id] = plate_elm
                plates_stiffness_array.append(stiffness)
                print('plates_stiffness_array = ', plates_stiffness_array)
        plates_stiffness_matrix = np.diag(plates_stiffness_array, 1) + \
                                  np.diag(plates_stiffness_array, -1) - \
                                  np.diag(plates_stiffness_array + [0]) - \
                                  np.diag([0] + plates_stiffness_array)

        fasteners_stiffness_matrix = np.zeros((self.nodes_qty, self.nodes_qty))
        for plt_id in self.plates_ids:
            if plt_id == plate_id:
                continue
            fasteners_stiffness_matrix += self.define_interplate_fastener_stiffness_matrix(plate_id, plt_id)

        combined_stiffness_matrix = plates_stiffness_matrix - fasteners_stiffness_matrix
        for i in range(self.nodes_qty):
            if combined_stiffness_matrix[i][i] == 0:
                combined_stiffness_matrix[i][i] = 1

        for condition in self.boundary_conditions.constraints:
            (bc_node_id, bc_plate_id, constraint) = condition
            # bc_node_id = boundary_condition.node_id
            bc_node_index = self.nodes_ids.index(bc_node_id)
            # bc_plate_id = boundary_condition.plate_id
            # For now, it's assumed that bc_constraint = 0

            if bc_plate_id == plate_id:
                combined_stiffness_matrix[bc_node_index][bc_node_index] = 1  # diagonal element
                if bc_node_index > 0:
                    combined_stiffness_matrix[bc_node_index - 1][bc_node_index] = 0  # above the diagonal element
                if bc_node_index < self.nodes_qty - 1:
                    combined_stiffness_matrix[bc_node_index + 1][bc_node_index] = 0  # below the diagonal element

        print('****************** define_plate_and_fastener_combined_stiffness_matrix plate = ', plate_id)
        return combined_stiffness_matrix

    def get_reactions(self):
        reactions = []
        for condition in self.boundary_conditions.constraints:
            (bc_node_id, bc_plate_id, constraint) = condition
            reaction_value = self.reactions_dict[(bc_node_id, bc_plate_id)]
            reactions.append((bc_node_id, bc_plate_id, reaction_value))
        return reactions

    def set_elements_displacements(self):
        for plate_index in range(self.plates_qty):
            plate_id = self.plates_ids[plate_index]
            for node_index in range(self.nodes_qty - 1):
                node1 = self.nodes[node_index]
                node2 = self.nodes[node_index + 1]

                [node1_id, node2_id] = sorted([node1.id, node2.id])
                disp1 = self.displacements_dict[(node1_id, plate_id)]
                disp2 = self.displacements_dict[(node2_id, plate_id)]
                plate_elm_id = (plate_id, node1_id, node2_id)
                if plate_elm_id in self.plate_elements:
                    plate_elm = self.plate_elements[plate_elm_id]
                    plate_elm.set_displacements(node1.coord_x, disp1, node2.coord_x, disp2)

        for node_id in list(self.fastener_models):
            fastener_model = self.fastener_models[node_id]
            if fastener_model != None:
                fastener_model.set_displacements(self.displacements_dict)
        # for fastener_elm_id in list(self.fastener_elements):
        #     fastener_elm = self.fastener_elements[fastener_elm_id]
        #     (node_id, plate1_id, plate2_id) = fastener_elm.id
        #     node_index = self.nodes_ids.index(node_id)
        #     node = self.nodes[node_index]
        #     plate1_index = self.plates_ids.index(plate1_id)
        #     plate2_index = self.plates_ids.index(plate2_id)
        #     disp1_index = plate1_index * self.nodes_qty + node_index
        #     disp2_index = plate2_index * self.nodes_qty + node_index
        #     disp1 = self.displacement_vector[disp1_index]
        #     disp2 = self.displacement_vector[disp2_index]
        #     fastener_elm.set_displacements(node, disp1, disp2)
