import os
import jwt
from flask import Flask, jsonify, request
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Meme cle secrete que l'auth-service (variable JWT_SECRET)
JWT_SECRET = os.environ.get('JWT_SECRET', 'supersecretkey')

# Database Connection
mongo_uri = os.environ.get('MONGO_URI', 'mongodb://mongo:27017/ecommerce')
client = MongoClient(mongo_uri)
db = client.ecommerce
products_collection = db.products


def current_user():
    """Retourne le username contenu dans le jeton JWT, ou None."""
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None
    try:
        payload = jwt.decode(header[7:], JWT_SECRET, algorithms=['HS256'])
        return payload.get('username')
    except jwt.InvalidTokenError:
        return None


@app.route('/products', methods=['GET'])
def get_products():
    username = current_user()
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401
    products = []
    # ?all=true : tous les produits (mode acheteur), sinon seulement les miens (mode vendeur)
    query = {} if request.args.get('all') == 'true' else {'owner': username}
    for doc in products_collection.find(query):
        doc['_id'] = str(doc['_id'])
        products.append(doc)
    return jsonify(products)


@app.route('/products', methods=['POST'])
def add_product():
    username = current_user()
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    data['owner'] = username
    result = products_collection.insert_one(data)
    return jsonify({'message': 'Product added', 'id': str(result.inserted_id)}), 201


@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    username = current_user()
    if not username:
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({'error': 'Invalid id'}), 400
    # Un vendeur ne peut supprimer que SES produits
    result = products_collection.delete_one({'_id': oid, 'owner': username})
    if result.deleted_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Product deleted'}), 200


def is_admin():
    """True si le jeton JWT contient admin = true."""
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return False
    try:
        payload = jwt.decode(header[7:], JWT_SECRET, algorithms=['HS256'])
        return bool(payload.get('admin'))
    except jwt.InvalidTokenError:
        return False


@app.route('/admin/products/<product_id>', methods=['DELETE'])
def admin_delete_product(product_id):
    if not is_admin():
        return jsonify({'error': 'Forbidden'}), 403
    try:
        oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({'error': 'Invalid id'}), 400
    result = products_collection.delete_one({'_id': oid})
    if result.deleted_count == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Product deleted'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
