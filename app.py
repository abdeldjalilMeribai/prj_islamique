from flask import Flask, render_template, jsonify, request
from datetime import datetime
import requests
import math

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('base.html')

@app.route('/prayers')
def prayers():
    return render_template('prayers.html')

@app.route('/qibla')
def qibla():
    return render_template('qibla.html')

@app.route('/adkar')
def reminders():
    return render_template('adkar.html')

@app.route('/adhkar')
def adhkar():
    return render_template('adhkar.html')


@app.route('/couran')
def couran():
    return render_template('couran.html')

@app.route('/api/prayer-times')
def api_prayer_times():
    lat = request.args.get('lat', '36.8065')  # Alger par défaut
    lng = request.args.get('lng', '3.0528')
    
    try:
        # Utiliser l'API Aladhan pour les horaires de prière
        url = f"http://api.aladhan.com/v1/timings/{datetime.now().strftime('%d-%m-%Y')}"
        params = {
            'latitude': lat,
            'longitude': lng,
            'method': 2,  # Islamic Society of North America (ISNA)
            'adjustment': 0
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data['code'] == 200:
            timings = data['data']['timings']
            
            # Formater les heures pour l'affichage
            formatted_timings = {}
            for prayer, time in timings.items():
                if prayer in ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']:
                    # Convertir au format 12 heures
                    time_obj = datetime.strptime(time, '%H:%M')
                    formatted_timings[prayer] = time_obj.strftime('%I:%M %p')
            
            return jsonify({
                'success': True,
                'timings': formatted_timings,
                'date': data['data']['date']['readable'],
                'hijri': data['data']['date']['hijri']['date'],
                'location': f"Lat: {lat}, Lng: {lng}"
            })
        else:
            return jsonify({
                'success': False, 
                'message': 'Erreur lors de la récupération des données'
            })
            
    except requests.exceptions.RequestException as e:
        print(f"Erreur réseau: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erreur de connexion à l\'API'
        })
    except Exception as e:
        print(f"Erreur générale: {e}")
        return jsonify({
            'success': False, 
            'message': 'Erreur interne du serveur'
        })

@app.route('/api/qibla-direction')
def api_qibla_direction():
    lat = request.args.get('lat', '36.8065')  # Alger par défaut
    lng = request.args.get('lng', '3.0528')
    
    try:
        # Coordonnées de la Kaaba à La Mecque
        mecca_lat = 21.4225
        mecca_lng = 39.8262
        
        # Calculer la direction de la Qibla
        lat_rad = math.radians(float(lat))
        lng_rad = math.radians(float(lng))
        mecca_lat_rad = math.radians(mecca_lat)
        mecca_lng_rad = math.radians(mecca_lng)
        
        delta_lng = mecca_lng_rad - lng_rad
        
        y = math.sin(delta_lng) * math.cos(mecca_lat_rad)
        x = math.cos(lat_rad) * math.sin(mecca_lat_rad) - \
            math.sin(lat_rad) * math.cos(mecca_lat_rad) * math.cos(delta_lng)
        
        bearing = math.atan2(y, x)
        bearing_degrees = (math.degrees(bearing) + 360) % 360
        
        return jsonify({
            'success': True,
            'direction': round(bearing_degrees, 2),
            'location': f"Lat: {lat}, Lng: {lng}"
        })
        
    except Exception as e:
        print(f"Erreur calcul Qibla: {e}")
        return jsonify({
            'success': False,
            'message': 'Erreur lors du calcul de la direction'
        })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)