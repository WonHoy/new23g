from django.http import JsonResponse
from django.shortcuts import render, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import ast
import datetime as dt

from .models import Material, Fastener
from joint_analysis.analysis.onedjoint import Joint


# TODO: Need to think what should we do with main index page. Create separate app?
def index(request):
    template = 'pt_applications/index.html'
    return render(request, template)


def joan_index(request):
    template = 'joint_analysis/joan_index.html'
    context = {

    }
    return render(request, template, context)

def joan_index1(request):
    template = 'joint_analysis/joan_index.html'
    context = {

    }
    return render(request, template, context)


@csrf_exempt
def joan_calc(request):
    if request.method == 'POST':
        # TODO
        # __________________________________________THE FOLLOWING INPUT IS DUMMY________________________________________
        #test_nodes = [
        #    {
        #        'id': 1,
        #        'coord_x': 0,
        #        'fastener_id': '',
        #        'plates_id': [1],
        #        'plates_th': [0.1],
        #        'plates_width': [1],
        #        'plates_area': [0.1],
        #        'hole_dia': '',
        #        'spacing': ''
        #    },
        #    {
        #        'id': 2,
        #        'coord_x': 1,
        #        'fastener_id': 'BACB30FN8A',
        #        'plates_id': [1, 2],
        #         'plates_th': [0.1, 0.063],
        #         'plates_width': [1, 1],
        #         'plates_area': [0.1, 0.063],
        #         'hole_dia': 0.25,
        #         'spacing': 1
        #     },
        #     {
        #         'id': 3,
        #         'coord_x': 2,
        #         'fastener_id': 'BACB30FN8A',
        #         'plates_id': [1, 2],
        #         'plates_th': [0.1, 0.063],
        #         'plates_width': [1, 1],
        #         'plates_area': [0.1, 0.063],
        #         'hole_dia': 0.25,
        #         'spacing': 1
        #     },
        #     {
        #         'id': 4,
        #         'coord_x': 3,
        #         'fastener_id': 'BACB30FN8A',
        #         'plates_id': [1, 2],
        #         'plates_th': [0.1, 0.063],
        #         'plates_width': [1, 1],
        #         'plates_area': [0.1, 0.063],
        #         'hole_dia': 0.25,
        #         'spacing': 1
        #     },
        #     {
        #         'id': 5,
        #         'coord_x': 4,
        #         'fastener_id': '',
        #         'plates_id': [2],
        #         'plates_th': [0.063],
        #         'plates_width': [1],
        #         'plates_area': [0.063],
        #         'hole_dia': '',
        #         'spacing': ''
        #     }
        # ]
        #
        # test_plates = {
        #     1: '2024',
        #     2: '2024'
        # }
        #
        # test_boundary_conditions = {
        #     'nodes_id': [1],
        #     'plates_id': [[1]],
        #     'constraints': [],
        # }
        #
        # test_loads = {
        #     'nodes_id': [5],
        #     'plates_id': [[2]],
        #     'loads': [[10]],
        # }
        #
        # test_joint_info = {
        #     'nodes': test_nodes,
        #     'plates': test_plates,
        #     'boundary_conditions': test_boundary_conditions,
        #     'loads': test_loads
        # }
        # --------------------------------The input below is taken from /joan/calc
        # test_joint_info = {
        #     "nodes": [
        #         {"id": 1, "coord_x": 1, "plates_id": [1], "plates_th": [0.1], "plates_width": [1], "plates_area": [0.1],
        #          "fastener_id": '', "hole_dia": '', "spacing": ''},
        #         {"id": 2, "coord_x": 2, "plates_id": [1, 2], "plates_th": [0.1, 0.063], "plates_width": [1, 1],
        #          "plates_area": [0.1, 0.063], "fastener_id": "BACR15GF5", "hole_dia": 0.25, "spacing": 1},
        #         {"id": 3, "coord_x": 3, "plates_id": [1, 2], "plates_th": [0.1, 0.063], "plates_width": [1, 1],
        #          "plates_area": [0.1, 0.063], "fastener_id": "BACR15GF5", "hole_dia": 0.25, "spacing": 1},
        #         {"id": 4, "coord_x": 4, "plates_id": [1, 2], "plates_th": [0.1, 0.063], "plates_width": [1, 1],
        #          "plates_area": [0.1, 0.063], "fastener_id": "BACR15GF5", "hole_dia": 0.25, "spacing": 1},
        #         {"id": 5, "coord_x": 5, "plates_id": [2], "plates_th": [0.063], "plates_width": [1],
        #          "plates_area": [0.063],
        #          "fastener_id": '', "hole_dia": '', "spacing": ''}],
        #     "plates": {"1": "2024", "2": "2024"},
        #     "boundary_conditions": {"nodes_id": [1], "plates_id": [[1]], "constraints": [[]]},
        #     "loads": {"nodes_id": [5], "plates_id": [[2]], "loads": [[10]]}}
        #
        #------------------------------------This is actual request input
        test_joint_info = ast.literal_eval(request.body.decode('utf-8') )
        for key in list(test_joint_info['plates'].keys()):
            # changing key data type from 'str' to 'int'
            test_joint_info['plates'][int(key)] = test_joint_info['plates'].pop(key)
        # TODO: check node_id logic (should work with start id != 1)

        # Saving files for debug
        try:
            f = open('.\\joint_analysis\\analysis\\debug_files\\test_joint_info.txt', 'w')
            f.write(str(test_joint_info))
            f.close()
        except FileNotFoundError:
            pass
        # __________________________________________THE FOLLOWING INPUT IS DUMMY________________________________________
        test_material_DB = {
            '2024':
                {
                    'E': 10300000
                },
            '2024-T3':
                {
                    'E': 10300000
                },
            '7075':
                {
                    'E': 10500000
                },
            '7075-T6':
                {
                    'E': 10500000
                },
            'Inconnel 625':
                {
                    'E': 29800000
                }

        }

        test_fastener_DB = {
            'BACR15GF5':
                {'type': 'rivet',
                 'D': 0.156,
                 'Ebb': 10300000,
                 'Gb': 4000000},
            'BACB30NW6K':
                {'type': 'bolt',
                 'D': 0.188,
                 'Ebb': 16900000,
                 'Gb': 6200000}
        }
        # TODO
        # _________________THE INPUT ABOVE NEEDS TO BE CHANGED WITH ACTUAL JSON REQUEST_________________________________
        model = Joint(test_joint_info, test_material_DB, test_fastener_DB)
        reactions = [list(item) for item in model.reactions]
        loads_summary = model.connections.get_loads_summary()
        loads_and_stresses = model.connections.get_summary_dicts()
        data = {
            'disp_vector': [num if num != 0 else '' for num in model.displacement_vector],
            'reactions': reactions,
            'loads_summary': loads_summary,
            'loads_and_stresses': loads_and_stresses,
            'message': str(dt.datetime.today())
        }
        return JsonResponse(data)
